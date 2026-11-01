/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DatabaseState } from './types/library.ts';
import { loadDatabase, registerReturn, formatDate, isOverdue } from './services/storage.ts';
import { Header, NavPage } from './components/Header.tsx';
import { Login } from './pages/Login.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { Acervo } from './pages/Acervo.tsx';
import { Leitores } from './pages/Leitores.tsx';
import { Emprestimos } from './pages/Emprestimos.tsx';
import { Importacao } from './pages/Importacao.tsx';
import { Relatorios } from './pages/Relatorios.tsx';
import { Configuracoes } from './pages/Configuracoes.tsx';
import { api } from './services/api.ts';

export default function App() {
  const [db, setDb] = useState<DatabaseState>(loadDatabase());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');
  const [selectedReaderForLoan, setSelectedReaderForLoan] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  // Sync with FastAPI backend on start
  const refreshFromBackend = async () => {
    try {
      const remoteDb = await api.carregarBancoCompleto();
      setDb(remoteDb);
      saveDatabase(remoteDb);
      setBackendConnected(true);
    } catch {
      // Backend offline or local standalone mode
      setBackendConnected(false);
    }
  };

  useEffect(() => {
    refreshFromBackend();
  }, []);

  // Sync state and persist immediately to SQLite and localStorage
  const handleUpdateDb = (newDb: DatabaseState) => {
    setDb(newDb);
    saveDatabase(newDb);
    api.sincronizarBanco(newDb);
  };

  const handleReturnFromDashboard = async (loanId: string) => {
    try {
      await api.registrarDevolucao(loanId);
    } catch (e) {
      console.warn('API direct return fallback:', e);
    }
    const res = registerReturn(db, loanId);
    if (res.success) {
      handleUpdateDb(res.db);
    }
  };

  const handleGoToLoanForReader = (readerId: string) => {
    setSelectedReaderForLoan(readerId);
    setCurrentPage('emprestimos');
  };

  const today = formatDate();
  const overdueCount = db.emprestimos.filter(
    (e) => !e.data_devolucao && isOverdue(e, today)
  ).length;

  if (!isAuthenticated) {
    return (
      <Login
        db={db}
        onLoginSuccess={() => setIsAuthenticated(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans antialiased">
      <Header
        currentPage={currentPage}
        onNavigate={(page) => {
          if (page !== 'emprestimos') {
            setSelectedReaderForLoan(null);
          }
          setCurrentPage(page);
        }}
        adminName={db?.admin?.usuario || 'Administrador'}
        overdueCount={overdueCount}
        onLogout={() => setIsAuthenticated(false)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {currentPage === 'dashboard' && (
          <Dashboard
            db={db}
            onNavigate={setCurrentPage}
            onReturnLoan={handleReturnFromDashboard}
          />
        )}

        {currentPage === 'acervo' && (
          <Acervo
            db={db}
            onUpdateDb={handleUpdateDb}
          />
        )}

        {currentPage === 'leitores' && (
          <Leitores
            db={db}
            onUpdateDb={handleUpdateDb}
            onGoToLoanForReader={handleGoToLoanForReader}
          />
        )}

        {currentPage === 'emprestimos' && (
          <Emprestimos
            db={db}
            onUpdateDb={handleUpdateDb}
            initialSelectedReaderId={selectedReaderForLoan}
          />
        )}

        {currentPage === 'importacao' && (
          <Importacao
            db={db}
            onUpdateDb={handleUpdateDb}
          />
        )}

        {currentPage === 'relatorios' && (
          <Relatorios
            db={db}
          />
        )}

        {currentPage === 'configuracoes' && (
          <Configuracoes
            db={db}
            onUpdateDb={handleUpdateDb}
          />
        )}
      </main>

      <footer className="border-t border-neutral-900 bg-neutral-950 py-4 px-6 text-center text-[11px] text-neutral-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Sistema de Gerenciamento de Biblioteca (Desktop Linux v1.0)</span>
          <span className="font-mono text-neutral-400">
            SQLite local WAL · 127.0.0.1 · Backup HDD Externo
          </span>
        </div>
      </footer>
    </div>
  );
}
