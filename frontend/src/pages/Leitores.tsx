import React, { useState } from 'react';
import { DatabaseState, Leitor, Emprestimo } from '../types/library.ts';
import { isOverdue, saveDatabase, formatDate } from '../services/storage.ts';
import {
  Search,
  Plus,
  Users,
  Edit2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  X,
  History,
  Clock,
  BookOpen
} from 'lucide-react';

interface LeitoresProps {
  db: DatabaseState;
  onUpdateDb: (newDb: DatabaseState) => void;
  onGoToLoanForReader: (readerId: string) => void;
}

export const Leitores: React.FC<LeitoresProps> = ({
  db,
  onUpdateDb,
  onGoToLoanForReader
}) => {
  const today = formatDate();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeitor, setEditingLeitor] = useState<Leitor | null>(null);

  // Form fields
  const [nome, setNome] = useState('');
  const [matricula, setMatricula] = useState('');
  const [tipoLeitorId, setTipoLeitorId] = useState(db.tiposLeitor[0]?.id || 'tipo-aluno');
  const [ano, setAno] = useState('1º Ano');
  const [sala, setSala] = useState('Turma A');
  const [contato, setContato] = useState('');

  // Reader Details / History drawer
  const [selectedReaderForHistory, setSelectedReaderForHistory] = useState<Leitor | null>(null);

  // Helper to determine reader status
  const getReaderStatus = (reader: Leitor) => {
    if (!reader.ativo) return { code: 'inativo', label: 'Inativo', color: 'text-neutral-500' };

    const readerOpenLoans = db.emprestimos.filter(
      (e) => e.leitor_id === reader.id && !e.data_devolucao
    );
    const hasOverdue = readerOpenLoans.some((l) => isOverdue(l, today));

    if (hasOverdue) {
      return {
        code: 'bloqueado',
        label: 'Bloqueado por Atraso',
        color: 'text-rose-400',
        overdueCount: readerOpenLoans.filter((l) => isOverdue(l, today)).length
      };
    }

    return {
      code: 'regular',
      label: 'Regular',
      color: 'text-emerald-400',
      openLoansCount: readerOpenLoans.length
    };
  };

  const filteredLeitores = db.leitores.filter((l) => {
    const matchSearch =
      l.nome.toLowerCase().includes(search.toLowerCase()) ||
      l.matricula.toLowerCase().includes(search.toLowerCase()) ||
      l.contato.toLowerCase().includes(search.toLowerCase());

    const matchType = filterType === 'todos' || l.tipo_leitor_id === filterType;

    const statusInfo = getReaderStatus(l);
    const matchStatus =
      filterStatus === 'todos' ||
      (filterStatus === 'bloqueados' && statusInfo.code === 'bloqueado') ||
      (filterStatus === 'regulares' && statusInfo.code === 'regular') ||
      (filterStatus === 'inativos' && statusInfo.code === 'inativo');

    return matchSearch && matchType && matchStatus;
  });

  const openNewModal = () => {
    setEditingLeitor(null);
    setNome('');
    setMatricula(`MAT-${Math.floor(1000 + Math.random() * 9000)}`);
    setTipoLeitorId(db.tiposLeitor[0]?.id || 'tipo-aluno');
    setAno('1º Ano');
    setSala('Turma A');
    setContato('');
    setIsModalOpen(true);
  };

  const openEditModal = (reader: Leitor) => {
    setEditingLeitor(reader);
    setNome(reader.nome);
    setMatricula(reader.matricula);
    setTipoLeitorId(reader.tipo_leitor_id);
    setAno(reader.ano || '1º Ano');
    setSala(reader.sala || 'Turma A');
    setContato(reader.contato);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    const selectedPolicy = db.tiposLeitor.find((t) => t.id === tipoLeitorId);
    const isStudent = selectedPolicy?.codigo === 'aluno';

    let updatedList: Leitor[];

    if (editingLeitor) {
      updatedList = db.leitores.map((l) =>
        l.id === editingLeitor.id
          ? {
              ...l,
              nome: nome.trim(),
              matricula: matricula.trim(),
              tipo_leitor_id: tipoLeitorId,
              ano: isStudent ? ano : undefined,
              sala: isStudent ? sala : undefined,
              contato: contato.trim()
            }
          : l
      );
    } else {
      const newReader: Leitor = {
        id: 'lei-' + Date.now(),
        nome: nome.trim(),
        matricula: matricula.trim() || `MAT-${Math.floor(1000 + Math.random() * 9000)}`,
        tipo_leitor_id: tipoLeitorId,
        ano: isStudent ? ano : undefined,
        sala: isStudent ? sala : undefined,
        contato: contato.trim() || 'Sem contato',
        ativo: true
      };
      updatedList = [newReader, ...db.leitores];
    }

    const nextDb = { ...db, leitores: updatedList };
    saveDatabase(nextDb);
    onUpdateDb(nextDb);
    setIsModalOpen(false);
  };

  const toggleReaderStatus = (reader: Leitor) => {
    const updated = db.leitores.map((l) =>
      l.id === reader.id ? { ...l, ativo: !l.ativo } : l
    );
    const nextDb = { ...db, leitores: updated };
    saveDatabase(nextDb);
    onUpdateDb(nextDb);
  };

  // Selected policy details for dynamic form
  const currentSelectedPolicy = db.tiposLeitor.find((t) => t.id === tipoLeitorId);
  const isSelectedStudent = currentSelectedPolicy?.codigo === 'aluno';

  // Reader loans history
  const readerHistoryLoans = selectedReaderForHistory
    ? db.emprestimos
        .filter((e) => e.leitor_id === selectedReaderForHistory.id)
        .sort((a, b) => b.data_emprestimo.localeCompare(a.data_emprestimo))
    : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Cadastro de Leitores</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Gestão de alunos (com ano e sala), professores e usuários do público geral com controle de pendências.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Leitor</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome, matrícula ou contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            aria-label="Filtrar por categoria de leitor"
            className="px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="todos">Todas as Categorias</option>
            {db.tiposLeitor.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filtrar por situação do leitor"
            className="px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="todos">Todas as Situações</option>
            <option value="regulares">Regulares</option>
            <option value="bloqueados">Bloqueados por Atraso</option>
            <option value="inativos">Inativos</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 text-neutral-400 font-semibold border-b border-neutral-800">
              <tr>
                <th className="py-3 px-4">Nome & Matrícula</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Ano / Sala</th>
                <th className="py-3 px-4">Contato</th>
                <th className="py-3 px-4 text-center">Situação (RF07)</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredLeitores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    Nenhum leitor encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredLeitores.map((reader) => {
                  const policy = db.tiposLeitor.find((t) => t.id === reader.tipo_leitor_id);
                  const statusInfo = getReaderStatus(reader);

                  return (
                    <tr
                      key={reader.id}
                      className={`hover:bg-neutral-800/40 transition-colors ${!reader.ativo ? 'opacity-60' : ''}`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{reader.nome}</div>
                        <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                          {reader.matricula}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-neutral-300 block">
                          {policy ? policy.nome : 'N/A'}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Limite: {policy?.limite_emprestimos} livros ({policy?.prazo_dias} dias)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-neutral-300">
                        {reader.ano ? (
                          <div>
                            <span className="font-medium">{reader.ano}</span>
                            <span className="text-[11px] text-neutral-400 block">{reader.sala}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-500">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-neutral-300">
                        {reader.contato}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {statusInfo.code === 'bloqueado' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2.5 py-1 rounded-md">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Bloqueado ({statusInfo.overdueCount} atrasado)</span>
                          </span>
                        ) : statusInfo.code === 'regular' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Regular ({statusInfo.openLoansCount} em aberto)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Inativo</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onGoToLoanForReader(reader.id)}
                            className="px-2.5 py-1 text-xs font-medium text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/60 rounded-lg transition-colors cursor-pointer"
                            title="Abrir no Balcão de Empréstimos"
                          >
                            Atender
                          </button>

                          <button
                            onClick={() => setSelectedReaderForHistory(reader)}
                            className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                            title="Histórico de empréstimos do leitor"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => openEditModal(reader)}
                            className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                            title="Editar cadastro"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => toggleReaderStatus(reader)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              reader.ativo
                                ? 'bg-neutral-950 hover:bg-rose-950/60 border-neutral-800 text-neutral-400 hover:text-rose-400'
                                : 'bg-neutral-950 hover:bg-emerald-950/60 border-neutral-800 text-neutral-400 hover:text-emerald-400'
                            }`}
                            title={reader.ativo ? 'Inativar leitor' : 'Reativar leitor'}
                          >
                            {reader.ativo ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          </button>
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

      {/* Modal: Novo / Editar Leitor (RF04) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-5">
              <h3 className="text-base font-bold text-white">
                {editingLeitor ? 'Editar Leitor' : 'Cadastrar Novo Leitor'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Lucas Silva Pereira"
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Categoria do Leitor *
                  </label>
                  <select
                    value={tipoLeitorId}
                    onChange={(e) => setTipoLeitorId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    {db.tiposLeitor.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Matrícula / Identificador
                  </label>
                  <input
                    type="text"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    placeholder="MAT-1234"
                    className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Conditional fields for Students (RF04: Alunos têm matrícula, ano e sala) */}
              {isSelectedStudent && (
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-3">
                  <span className="text-[11px] font-semibold text-indigo-400 block">
                    Dados Acadêmicos do Aluno (Snapshot de Turma)
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">
                        Ano / Série
                      </label>
                      <input
                        type="text"
                        value={ano}
                        onChange={(e) => setAno(e.target.value)}
                        placeholder="Ex: 2º Ano"
                        className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">
                        Sala / Turma
                      </label>
                      <input
                        type="text"
                        value={sala}
                        onChange={(e) => setSala(e.target.value)}
                        placeholder="Ex: Turma A"
                        className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Contato (E-mail / Telefone)
                </label>
                <input
                  type="text"
                  value={contato}
                  onChange={(e) => setContato(e.target.value)}
                  placeholder="email@exemplo.com / (11) 99999-9999"
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
                >
                  {editingLeitor ? 'Salvar Alterações' : 'Salvar Leitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer / Modal: Histórico Completo de Empréstimos do Leitor */}
      {selectedReaderForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-5">
              <div>
                <h3 className="text-base font-bold text-white">
                  Histórico de Empréstimos: {selectedReaderForHistory.nome}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Matrícula: {selectedReaderForHistory.matricula} · Total de registros: {readerHistoryLoans.length}
                </p>
              </div>
              <button
                onClick={() => setSelectedReaderForHistory(null)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {readerHistoryLoans.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-xs">
                  Este leitor ainda não realizou nenhum empréstimo.
                </div>
              ) : (
                readerHistoryLoans.map((loan) => {
                  const exemplar = db.exemplares.find((x) => x.id === loan.exemplar_id);
                  const obra = exemplar ? db.obras.find((o) => o.id === exemplar.obra_id) : null;
                  const isReturned = !!loan.data_devolucao;
                  const overdue = !isReturned && isOverdue(loan, today);

                  return (
                    <div
                      key={loan.id}
                      className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          {obra ? obra.titulo : 'Obra'}
                          <span className="font-mono text-neutral-400 ml-2">[{exemplar?.codigo_barras}]</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
                          <span>Retirada: {loan.data_emprestimo}</span>
                          <span aria-hidden="true">·</span>
                          <span>Prazo Previsto: {loan.data_prevista}</span>
                          <span aria-hidden="true">·</span>
                          <span>Renovações: {loan.renovacoes}</span>
                          {loan.ano_leitor && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Snapshot: {loan.ano_leitor} / {loan.sala_leitor}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isReturned ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Devolvido em {loan.data_devolucao}</span>
                          </span>
                        ) : overdue ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-bold bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Vencido</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Em Aberto</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
