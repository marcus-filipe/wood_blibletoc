import React, { useState, useEffect } from 'react';
import { DatabaseState, Emprestimo } from '../types/library.ts';
import { api } from '../services/api.ts';
import {
  isOverdue,
  validateNewLoan,
  registerLoan,
  registerReturn,
  renewLoan,
  formatDate
} from '../services/storage.ts';
import {
  ArrowLeftRight,
  Barcode,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  RotateCcw,
  Check,
  UserCheck,
  BookMarked,
  AlertCircle
} from 'lucide-react';

interface EmprestimosProps {
  db: DatabaseState;
  onUpdateDb: (newDb: DatabaseState) => void;
  initialSelectedReaderId?: string | null;
}

export const Emprestimos: React.FC<EmprestimosProps> = ({
  db,
  onUpdateDb,
  initialSelectedReaderId
}) => {
  const today = formatDate();

  // Circulation desk state
  const [selectedReaderId, setSelectedReaderId] = useState<string>(initialSelectedReaderId || '');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Tabs for the loan list
  const [activeTab, setActiveTab] = useState<'abertos' | 'atrasados' | 'devolvidos'>('abertos');
  const [searchTable, setSearchTable] = useState('');

  // Update selected reader if prop changes
  useEffect(() => {
    if (initialSelectedReaderId) {
      setSelectedReaderId(initialSelectedReaderId);
    }
  }, [initialSelectedReaderId]);

  // Selected reader details
  const selectedReader = db.leitores.find((l) => l.id === selectedReaderId);
  const selectedReaderPolicy = selectedReader
    ? db.tiposLeitor.find((t) => t.id === selectedReader.tipo_leitor_id) || db.tiposLeitor[0]
    : null;

  const selectedReaderOpenLoans = selectedReader
    ? db.emprestimos.filter((e) => e.leitor_id === selectedReader.id && !e.data_devolucao)
    : [];

  const selectedReaderHasOverdue = selectedReaderOpenLoans.some((l) => isOverdue(l, today));
  const selectedReaderHitLimit = selectedReaderPolicy
    ? selectedReaderOpenLoans.length >= selectedReaderPolicy.limite_emprestimos
    : false;

  // Selected exemplar details from barcode
  const matchedExemplar = barcodeInput.trim()
    ? db.exemplares.find(
        (ex) => ex.codigo_barras.toLowerCase() === barcodeInput.trim().toLowerCase()
      )
    : null;
  const matchedObra = matchedExemplar ? db.obras.find((o) => o.id === matchedExemplar.obra_id) : null;

  // Handle new loan registration
  const handleRegisterLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedReaderId) {
      setFeedback({ type: 'error', message: 'Selecione um leitor para o atendimento.' });
      return;
    }
    if (!matchedExemplar) {
      setFeedback({ type: 'error', message: 'Código de barras / tombo não encontrado no acervo.' });
      return;
    }

    try {
      await api.registrarEmprestimo(selectedReaderId, matchedExemplar.id, matchedExemplar.codigo_barras);
    } catch (e) {
      console.warn('API direct loan fallback:', e);
    }

    const result = registerLoan(db, selectedReaderId, matchedExemplar.id);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setBarcodeInput('');
      onUpdateDb(result.db);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  // Handle return
  const handleReturn = async (loanId: string) => {
    setFeedback(null);
    try {
      await api.registrarDevolucao(loanId);
    } catch (e) {
      console.warn('API direct return fallback:', e);
    }
    const result = registerReturn(db, loanId);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      onUpdateDb(result.db);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  // Handle renew
  const handleRenew = async (loanId: string) => {
    setFeedback(null);
    try {
      await api.registrarRenovacao(loanId);
    } catch (e) {
      console.warn('API direct renew fallback:', e);
    }
    const result = renewLoan(db, loanId);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      onUpdateDb(result.db);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  // Filtered loan lists
  const openLoans = db.emprestimos.filter((e) => !e.data_devolucao);
  const overdueLoans = openLoans.filter((e) => isOverdue(e, today));
  const returnedLoans = db.emprestimos.filter((e) => !!e.data_devolucao);

  let currentList =
    activeTab === 'abertos'
      ? openLoans
      : activeTab === 'atrasados'
      ? overdueLoans
      : returnedLoans;

  if (searchTable.trim()) {
    const q = searchTable.toLowerCase();
    currentList = currentList.filter((loan) => {
      const r = db.leitores.find((l) => l.id === loan.leitor_id);
      const ex = db.exemplares.find((x) => x.id === loan.exemplar_id);
      const o = ex ? db.obras.find((ob) => ob.id === ex.obra_id) : null;
      return (
        r?.nome.toLowerCase().includes(q) ||
        r?.matricula.toLowerCase().includes(q) ||
        ex?.codigo_barras.toLowerCase().includes(q) ||
        o?.titulo.toLowerCase().includes(q)
      );
    });
  }

  const calculateDaysOverdue = (dataPrevista: string) => {
    const diffTime =
      new Date(today + 'T00:00:00').getTime() - new Date(dataPrevista + 'T00:00:00').getTime();
    return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Balcão de Empréstimos & Circulação</h1>
        <p className="text-xs text-neutral-400 mt-1">
          Atendimento rápido com leitura de código de barras, devoluções, renovações e aplicação automática de políticas de atraso.
        </p>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800/80 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            )}
            <span className="leading-relaxed">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-neutral-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Circulation Desk Interactive Station */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step 1: Reader Selection & Status Check */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-3">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <UserCheck className="w-4 h-4" />
                <span>1. Identificação do Leitor</span>
              </span>
              {selectedReader && (
                <span className="text-neutral-400 font-mono text-[11px]">{selectedReader.matricula}</span>
              )}
            </div>

            <div className="mb-4">
              <select
                value={selectedReaderId}
                onChange={(e) => setSelectedReaderId(e.target.value)}
                aria-label="Selecionar leitor para empréstimo"
                className="w-full px-3.5 py-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">-- Selecione o Leitor para Atender --</option>
                {db.leitores.map((reader) => {
                  const policy = db.tiposLeitor.find((t) => t.id === reader.tipo_leitor_id);
                  const openCount = db.emprestimos.filter(
                    (e) => e.leitor_id === reader.id && !e.data_devolucao
                  ).length;
                  const hasLate = db.emprestimos.some(
                    (e) => e.leitor_id === reader.id && !e.data_devolucao && isOverdue(e, today)
                  );
                  return (
                    <option key={reader.id} value={reader.id}>
                      {reader.nome} ({policy?.nome || 'Leitor'}) - {reader.matricula}
                      {hasLate ? ' [EM ATRASO - BLOQUEADO]' : ` [${openCount} itens]`}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Reader Status Card */}
            {selectedReader && selectedReaderPolicy && (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{selectedReader.nome}</span>
                  <span className="text-xs font-medium text-neutral-300">
                    {selectedReaderPolicy.nome}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-400 border-t border-b border-neutral-800/80 py-2">
                  <div>
                    <span>Limite Permitido: </span>
                    <strong className="text-white font-mono">{selectedReaderPolicy.limite_emprestimos} itens</strong>
                  </div>
                  <div>
                    <span>Prazo por Empréstimo: </span>
                    <strong className="text-white font-mono">{selectedReaderPolicy.prazo_dias} dias</strong>
                  </div>
                  {selectedReader.ano && (
                    <div className="col-span-2">
                      <span>Turma Acadêmica: </span>
                      <strong className="text-white">{selectedReader.ano} · {selectedReader.sala}</strong>
                    </div>
                  )}
                </div>

                {/* Overdue Block Notification (RF07) */}
                {selectedReaderHasOverdue ? (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <strong className="block text-white font-semibold">Leitor Bloqueado para Novos Empréstimos</strong>
                      <span>
                        Este leitor possui livros em atraso. Regularize a devolução abaixo para liberar o balcão.
                      </span>
                    </div>
                  </div>
                ) : selectedReaderHitLimit ? (
                  <div className="p-3 rounded-lg bg-amber-950/50 border border-amber-800/60 text-xs text-amber-300">
                    <strong>Limite Máximo Atingido: </strong>
                    <span>Este leitor já atingiu o limite de {selectedReaderPolicy.limite_emprestimos} livros simultâneos.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Leitor regular. Disponível para retirar até {selectedReaderPolicy.limite_emprestimos - selectedReaderOpenLoans.length} exemplar(es).</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Barcode Reader & Loan Confirmation */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between">
          <form onSubmit={handleRegisterLoan} className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-1">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <BookMarked className="w-4 h-4" />
                <span>2. Leitura do Exemplar (Código de Barras / Tombo)</span>
              </span>
            </div>

            <div className="relative">
              <Barcode className="w-4 h-4 absolute left-3 top-3 text-neutral-500" />
              <input
                type="text"
                placeholder="Digitar ou escanear código de barras (Ex: TOMBO-1001)..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono uppercase placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Quick Exemplar Suggestions / Match Card */}
            {matchedExemplar ? (
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{matchedObra?.titulo}</span>
                  <span className="font-mono text-indigo-400">{matchedExemplar.codigo_barras}</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  {matchedObra?.autor} · {matchedObra?.categoria}
                </p>
                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Status atual do exemplar:</span>
                  <span
                    className={`font-semibold capitalize ${
                      matchedExemplar.status === 'disponivel'
                        ? 'text-emerald-400'
                        : matchedExemplar.status === 'emprestado'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {matchedExemplar.status}
                  </span>
                </div>
              </div>
            ) : barcodeInput.trim() ? (
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-400">
                Nenhum exemplar localizado com o tombo "{barcodeInput.toUpperCase()}".
              </div>
            ) : (
              <div className="text-[11px] text-neutral-500">
                <span>Dica: Códigos disponíveis para teste: </span>
                {db.exemplares
                  .filter((ex) => ex.status === 'disponivel')
                  .slice(0, 4)
                  .map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => setBarcodeInput(ex.codigo_barras)}
                      className="font-mono text-neutral-400 hover:text-indigo-400 underline mr-2 cursor-pointer"
                    >
                      {ex.codigo_barras}
                    </button>
                  ))}
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedReaderId || !matchedExemplar || selectedReaderHasOverdue || selectedReaderHitLimit || matchedExemplar.status !== 'disponivel'}
              className="w-full py-3 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Conceder Empréstimo no Balcão</span>
            </button>
          </form>
        </div>
      </div>

      {/* Circulation Management Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-xl border border-neutral-800 w-fit">
            <button
              onClick={() => setActiveTab('abertos')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'abertos'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Em Aberto</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-950 text-neutral-300">
                {openLoans.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('atrasados')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'atrasados'
                  ? 'bg-rose-950/80 text-rose-200 border border-rose-800/80 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Em Atraso</span>
              {overdueLoans.length > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-bold">
                  {overdueLoans.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('devolvidos')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'devolvidos'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Histórico Devolvidos</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-950 text-neutral-300">
                {returnedLoans.length}
              </span>
            </button>
          </div>

          {/* Search Table */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Filtrar por livro, leitor ou tombo..."
              value={searchTable}
              onChange={(e) => setSearchTable(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/80 text-neutral-400 font-semibold border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Obra & Tombo</th>
                  <th className="py-3 px-4">Leitor</th>
                  <th className="py-3 px-4 text-center">Retirada</th>
                  <th className="py-3 px-4 text-center">Prazo Previsto</th>
                  <th className="py-3 px-4 text-center">Renovações</th>
                  <th className="py-3 px-4 text-center">Situação</th>
                  <th className="py-3 px-4 text-right">Ações no Balcão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {currentList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-500">
                      Nenhum empréstimo encontrado nesta visualização.
                    </td>
                  </tr>
                ) : (
                  currentList.map((loan) => {
                    const reader = db.leitores.find((l) => l.id === loan.leitor_id);
                    const policy = reader
                      ? db.tiposLeitor.find((t) => t.id === reader.tipo_leitor_id) || db.tiposLeitor[0]
                      : db.tiposLeitor[0];
                    const exemplar = db.exemplares.find((x) => x.id === loan.exemplar_id);
                    const obra = exemplar ? db.obras.find((o) => o.id === exemplar.obra_id) : null;

                    const isReturned = !!loan.data_devolucao;
                    const overdue = !isReturned && isOverdue(loan, today);
                    const daysLate = overdue ? calculateDaysOverdue(loan.data_prevista) : 0;
                    const canRenew = !isReturned && !overdue && loan.renovacoes < policy.max_renovacoes;

                    return (
                      <tr
                        key={loan.id}
                        className={`hover:bg-neutral-800/40 transition-colors ${
                          overdue ? 'bg-rose-950/10' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{obra?.titulo || 'Obra'}</div>
                          <div className="font-mono text-[11px] text-neutral-400 mt-0.5">
                            {exemplar?.codigo_barras} <span aria-hidden="true">·</span> {obra?.autor}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-white">{reader?.nome || 'Leitor'}</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5">
                            {reader?.matricula} · {policy?.nome}
                            {loan.ano_leitor && ` (${loan.ano_leitor}/${loan.sala_leitor})`}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono tabular-nums text-neutral-300">
                          {loan.data_emprestimo}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono tabular-nums">
                          <span className={overdue ? 'text-rose-400 font-bold' : 'text-neutral-300'}>
                            {loan.data_prevista}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono tabular-nums text-neutral-300">
                          {loan.renovacoes} / {policy.max_renovacoes}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isReturned ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Devolvido ({loan.data_devolucao})</span>
                            </span>
                          ) : overdue ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{daysLate}d em atraso</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
                              <Clock className="w-3.5 h-3.5" />
                              <span>No prazo</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isReturned && (
                              <>
                                <button
                                  onClick={() => handleReturn(loan.id)}
                                  className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
                                  title="Registrar devolução do livro"
                                >
                                  Devolver
                                </button>

                                <button
                                  onClick={() => handleRenew(loan.id)}
                                  disabled={!canRenew}
                                  className="px-2.5 py-1 text-xs font-medium text-neutral-300 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed border border-neutral-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                  title={
                                    overdue
                                      ? 'Não é permitido renovar item atrasado'
                                      : loan.renovacoes >= policy.max_renovacoes
                                      ? 'Limite máximo de renovações atingido'
                                      : 'Renovar prazo'
                                  }
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Renovar</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
