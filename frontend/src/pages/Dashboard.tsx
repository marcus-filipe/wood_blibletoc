import React from 'react';
import { DatabaseState, Emprestimo } from '../types/library.ts';
import { isOverdue, formatDate } from '../services/storage.ts';
import { NavPage } from '../components/Header.tsx';
import {
  BookOpen,
  Users,
  ArrowLeftRight,
  AlertTriangle,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  Plus
} from 'lucide-react';

interface DashboardProps {
  db: DatabaseState;
  onNavigate: (page: NavPage) => void;
  onReturnLoan: (loanId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ db, onNavigate, onReturnLoan }) => {
  const today = formatDate();

  // Metrics
  const totalObras = db.obras.length;
  const obrasAtivas = db.obras.filter((o) => o.ativo).length;
  const totalExemplares = db.exemplares.length;
  const exemplaresDisponiveis = db.exemplares.filter((e) => e.status === 'disponivel').length;
  const totalLeitores = db.leitores.length;
  const leitoresAtivos = db.leitores.filter((l) => l.ativo).length;

  const openLoans = db.emprestimos.filter((e) => !e.data_devolucao);
  const overdueLoans = openLoans.filter((e) => isOverdue(e, today));

  // Recent loans
  const recentLoans = [...db.emprestimos]
    .sort((a, b) => b.data_emprestimo.localeCompare(a.data_emprestimo))
    .slice(0, 6);

  const getLoanDetails = (loan: Emprestimo) => {
    const reader = db.leitores.find((l) => l.id === loan.leitor_id);
    const exemplar = db.exemplares.find((ex) => ex.id === loan.exemplar_id);
    const obra = exemplar ? db.obras.find((o) => o.id === exemplar.obra_id) : null;
    return { reader, exemplar, obra };
  };

  const calculateDaysOverdue = (dataPrevista: string) => {
    const diffTime = new Date(today + 'T00:00:00').getTime() - new Date(dataPrevista + 'T00:00:00').getTime();
    return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome & System status banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
            <span>Servidor FastAPI 127.0.0.1</span>
            <span aria-hidden="true">·</span>
            <span>SQLite WAL</span>
            <span aria-hidden="true">·</span>
            <span>Hoje: {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Painel Geral da Biblioteca
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('emprestimos')}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Balcão de Empréstimos</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Obras */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-3">
            <span className="text-xs font-medium">Obras no Acervo</span>
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">{totalObras}</div>
            <p className="text-[11px] text-neutral-400 mt-1">{obrasAtivas} obras ativas</p>
          </div>
        </div>

        {/* Exemplares */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-3">
            <span className="text-xs font-medium">Exemplares</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-sky-400 font-mono tabular-nums">
              {exemplaresDisponiveis}
              <span className="text-sm font-normal text-neutral-400"> / {totalExemplares}</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">Disponíveis para retirada</p>
          </div>
        </div>

        {/* Leitores */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-3">
            <span className="text-xs font-medium">Leitores</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">{totalLeitores}</div>
            <p className="text-[11px] text-neutral-400 mt-1">{leitoresAtivos} regulares e ativos</p>
          </div>
        </div>

        {/* Empréstimos Ativos */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-3">
            <span className="text-xs font-medium">Empréstimos Abertos</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-300 font-mono tabular-nums">{openLoans.length}</div>
            <p className="text-[11px] text-neutral-400 mt-1">Em circulação no momento</p>
          </div>
        </div>

        {/* Atrasos Urgentes */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between col-span-2 lg:col-span-1 ${
          overdueLoans.length > 0
            ? 'bg-rose-950/40 border-rose-800/80'
            : 'bg-neutral-900/60 border-neutral-800'
        }`}>
          <div className="flex items-center justify-between text-neutral-400 mb-3">
            <span className={`text-xs font-semibold ${overdueLoans.length > 0 ? 'text-rose-400' : 'text-neutral-400'}`}>
              Em Atraso (Bloqueados)
            </span>
            <AlertTriangle className={`w-4 h-4 ${overdueLoans.length > 0 ? 'text-rose-400' : 'text-neutral-500'}`} />
          </div>
          <div>
            <div className={`text-2xl font-bold font-mono tabular-nums ${overdueLoans.length > 0 ? 'text-rose-300' : 'text-neutral-300'}`}>
              {overdueLoans.length}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              {overdueLoans.length > 0 ? 'Impedem novos empréstimos' : 'Sem atrasos pendentes'}
            </p>
          </div>
        </div>
      </div>

      {/* Alert Banner for Overdue Loans (RF07) */}
      {overdueLoans.length > 0 && (
        <div className="p-6 rounded-2xl bg-rose-950/50 border border-rose-800/80">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <h2 className="text-sm font-bold text-white">
                  Atenção: {overdueLoans.length} empréstimo{overdueLoans.length > 1 ? 's' : ''} em atraso detectado{overdueLoans.length > 1 ? 's' : ''}
                </h2>
                <p className="text-xs text-rose-300/80 mt-0.5">
                  Conforme a regra RF07, esses leitores estão automaticamente bloqueados para novos empréstimos até a devolução dos itens.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('emprestimos')}
              className="px-3 py-1.5 text-xs font-medium text-rose-200 bg-rose-900/60 hover:bg-rose-900 border border-rose-700/60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Ver no Balcão
            </button>
          </div>

          <div className="divide-y divide-rose-900/50 bg-neutral-950/60 rounded-xl border border-rose-900/60 overflow-hidden">
            {overdueLoans.map((loan) => {
              const { reader, exemplar, obra } = getLoanDetails(loan);
              const daysLate = calculateDaysOverdue(loan.data_prevista);
              return (
                <div key={loan.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-white">
                      {obra ? obra.titulo : 'Obra Desconhecida'}
                      <span className="text-neutral-400 font-normal font-mono ml-2">
                        [{exemplar ? exemplar.codigo_barras : 'N/A'}]
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-rose-300 mt-0.5">
                      <span>Leitor: <strong className="text-white">{reader ? reader.nome : 'N/A'}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Matrícula: {reader?.matricula}</span>
                      <span aria-hidden="true">·</span>
                      <span>Prazo venceu em: {loan.data_prevista} ({daysLate} dia{daysLate > 1 ? 's' : ''} atrás)</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onReturnLoan(loan.id)}
                    className="self-start sm:self-center px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Registrar Devolução
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions & Recent Activity Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Quick Actions Grid */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-base font-bold text-white">Ações Rápidas do Administrador</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <button
              onClick={() => onNavigate('emprestimos')}
              className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 transition-all text-left flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Atendimento no Balcão</span>
                  <span className="text-[11px] text-neutral-400">Empréstimos, devoluções e renovações</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={() => onNavigate('acervo')}
              className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 transition-all text-left flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Gerenciar Acervo</span>
                  <span className="text-[11px] text-neutral-400">Cadastrar obras e gerar exemplares</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={() => onNavigate('leitores')}
              className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 transition-all text-left flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Cadastro de Leitores</span>
                  <span className="text-[11px] text-neutral-400">Alunos, professores e público externo</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={() => onNavigate('importacao')}
              className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 transition-all text-left flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Importação por Planilha</span>
                  <span className="text-[11px] text-neutral-400">Lote de livros via CSV ou XLSX</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Right: Recent Loans Activity */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Movimentações Recentes</h2>
            <button
              onClick={() => onNavigate('relatorios')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              Ver Estatísticas
            </button>
          </div>

          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 overflow-hidden">
            <div className="divide-y divide-neutral-800">
              {recentLoans.map((loan) => {
                const { reader, exemplar, obra } = getLoanDetails(loan);
                const isReturned = !!loan.data_devolucao;
                const overdue = !isReturned && isOverdue(loan, today);

                return (
                  <div key={loan.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <p className="font-semibold text-white">
                        {obra ? obra.titulo : 'Obra'}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
                        <span>Leitor: <span className="text-neutral-300">{reader?.nome}</span></span>
                        <span aria-hidden="true">·</span>
                        <span>Tombo: <span className="font-mono">{exemplar?.codigo_barras}</span></span>
                        <span aria-hidden="true">·</span>
                        <span>Retirado em: {loan.data_emprestimo}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isReturned ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Devolvido ({loan.data_devolucao})</span>
                        </span>
                      ) : overdue ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Vencido ({loan.data_prevista})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Em aberto (Prev: {loan.data_prevista})</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
