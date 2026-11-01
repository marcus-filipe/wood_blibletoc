import React, { useState } from 'react';
import { DatabaseState, Emprestimo } from '../types/library.ts';
import { isOverdue, formatDate } from '../services/storage.ts';
import { downloadCSV, downloadXLSX } from '../services/exportService.ts';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

interface RelatoriosProps {
  db: DatabaseState;
}

export const Relatorios: React.FC<RelatoriosProps> = ({ db }) => {
  const today = formatDate();
  const [activeReport, setActiveReport] = useState<'livros' | 'alunos' | 'periodo' | 'atrasos'>('livros');
  const [periodFilter, setPeriodFilter] = useState<'todos' | '7dias' | '30dias' | 'ano'>('todos');
  const [filterAno, setFilterAno] = useState<string>('todos');
  const [filterSala, setFilterSala] = useState<string>('todos');

  // Helper date filter
  const filterByPeriod = (loans: Emprestimo[]) => {
    if (periodFilter === 'todos') return loans;
    const now = new Date(today + 'T00:00:00').getTime();
    const daysLimit = periodFilter === '7dias' ? 7 : periodFilter === '30dias' ? 30 : 365;

    return loans.filter((loan) => {
      const loanTime = new Date(loan.data_emprestimo + 'T00:00:00').getTime();
      const diffDays = (now - loanTime) / (1000 * 60 * 60 * 24);
      return diffDays <= daysLimit;
    });
  };

  const periodFilteredLoans = filterByPeriod(db.emprestimos);

  // 1. Report: Livros mais e menos emprestados
  const bookBorrowCounts = db.obras.map((obra) => {
    // Count copies borrowed
    const copies = db.exemplares.filter((ex) => ex.obra_id === obra.id);
    const copyIds = new Set(copies.map((c) => c.id));
    const borrows = periodFilteredLoans.filter((l) => copyIds.has(l.exemplar_id)).length;
    return {
      obra,
      totalEmprestimos: borrows,
      totalExemplares: copies.length
    };
  });

  const mostBorrowed = [...bookBorrowCounts].sort(
    (a, b) => b.totalEmprestimos - a.totalEmprestimos
  );
  const leastBorrowed = [...bookBorrowCounts].sort(
    (a, b) => a.totalEmprestimos - b.totalEmprestimos
  );

  // 2. Report: Alunos com mais empréstimos (filtráveis por ano e sala snapshot)
  const studentLoans = periodFilteredLoans.filter((l) => {
    const reader = db.leitores.find((r) => r.id === l.leitor_id);
    const policy = reader ? db.tiposLeitor.find((t) => t.id === reader.tipo_leitor_id) : null;
    const isStudent = policy?.codigo === 'aluno';

    if (!isStudent) return false;

    // Use snapshot from loan or reader current
    const ano = l.ano_leitor || reader?.ano || '';
    const sala = l.sala_leitor || reader?.sala || '';

    const matchAno = filterAno === 'todos' || ano === filterAno;
    const matchSala = filterSala === 'todos' || sala === filterSala;
    return matchAno && matchSala;
  });

  // Aggregate by student
  const studentBorrowMap = new Map<string, { reader: typeof db.leitores[0]; count: number; ano: string; sala: string }>();
  studentLoans.forEach((l) => {
    const reader = db.leitores.find((r) => r.id === l.leitor_id);
    if (!reader) return;
    const existing = studentBorrowMap.get(reader.id);
    const ano = l.ano_leitor || reader.ano || 'N/A';
    const sala = l.sala_leitor || reader.sala || 'N/A';

    if (existing) {
      existing.count += 1;
    } else {
      studentBorrowMap.set(reader.id, { reader, count: 1, ano, sala });
    }
  });

  const topStudents = Array.from(studentBorrowMap.values()).sort((a, b) => b.count - a.count);

  // 3. Report: Atrasos atuais e histórico
  const overdueLoansList = db.emprestimos
    .filter((l) => isOverdue(l, today))
    .map((l) => {
      const reader = db.leitores.find((r) => r.id === l.leitor_id);
      const ex = db.exemplares.find((x) => x.id === l.exemplar_id);
      const obra = ex ? db.obras.find((o) => o.id === ex.obra_id) : null;
      const daysOverdue = Math.max(
        1,
        Math.round(
          (new Date(today).getTime() - new Date(l.data_prevista).getTime()) / (1000 * 60 * 60 * 24)
        )
      );
      return { loan: l, reader, exemplar: ex, obra, daysOverdue };
    });

  // Distinct classes for filters
  const distinctAnos = Array.from(
    new Set(db.leitores.map((l) => l.ano).filter((a): a is string => !!a))
  );
  const distinctSalas = Array.from(
    new Set(db.leitores.map((l) => l.sala).filter((s): s is string => !!s))
  );

  // EXPORT HANDLERS (RF09)
  const handleExportCSV = () => {
    if (activeReport === 'livros') {
      const data = mostBorrowed.map((item, idx) => ({
        Posicao: idx + 1,
        Titulo: item.obra.titulo,
        Autor: item.obra.autor,
        Categoria: item.obra.categoria,
        ISBN: item.obra.isbn,
        EmprestimosNoPeriodo: item.totalEmprestimos,
        TotalExemplares: item.totalExemplares
      }));
      downloadCSV(`relatorio_livros_emprestados_${formatDate()}.csv`, data);
    } else if (activeReport === 'alunos') {
      const data = topStudents.map((item, idx) => ({
        Posicao: idx + 1,
        Aluno: item.reader.nome,
        Matricula: item.reader.matricula,
        AnoEscolar: item.ano,
        SalaTurma: item.sala,
        QuantidadeEmprestimos: item.count
      }));
      downloadCSV(`relatorio_alunos_emprestimos_${formatDate()}.csv`, data);
    } else if (activeReport === 'atrasos') {
      const data = overdueLoansList.map((item) => ({
        Obra: item.obra?.titulo || '',
        Tombo: item.exemplar?.codigo_barras || '',
        Leitor: item.reader?.nome || '',
        Matricula: item.reader?.matricula || '',
        DataRetirada: item.loan.data_emprestimo,
        DataPrevista: item.loan.data_prevista,
        DiasEmAtraso: item.daysOverdue
      }));
      downloadCSV(`relatorio_atrasos_${formatDate()}.csv`, data);
    } else {
      const data = periodFilteredLoans.map((l) => {
        const r = db.leitores.find((reader) => reader.id === l.leitor_id);
        const ex = db.exemplares.find((x) => x.id === l.exemplar_id);
        const o = ex ? db.obras.find((ob) => ob.id === ex.obra_id) : null;
        return {
          ID_Emprestimo: l.id,
          Obra: o?.titulo || '',
          Tombo: ex?.codigo_barras || '',
          Leitor: r?.nome || '',
          DataEmprestimo: l.data_emprestimo,
          DataPrevista: l.data_prevista,
          DataDevolucao: l.data_devolucao || 'Em Aberto',
          Renovacoes: l.renovacoes
        };
      });
      downloadCSV(`relatorio_circulacao_${formatDate()}.csv`, data);
    }
  };

  const handleExportXLSX = () => {
    if (activeReport === 'livros') {
      const data = mostBorrowed.map((item, idx) => ({
        'Posição': idx + 1,
        'Título da Obra': item.obra.titulo,
        'Autor': item.obra.autor,
        'Categoria': item.obra.categoria,
        'ISBN': item.obra.isbn,
        'Total Empréstimos': item.totalEmprestimos,
        'Exemplares no Acervo': item.totalExemplares
      }));
      downloadXLSX(`relatorio_livros_${formatDate()}.xlsx`, 'Livros', data);
    } else if (activeReport === 'alunos') {
      const data = topStudents.map((item, idx) => ({
        'Posição': idx + 1,
        'Nome do Aluno': item.reader.nome,
        'Matrícula': item.reader.matricula,
        'Ano': item.ano,
        'Turma': item.sala,
        'Total Empréstimos': item.count
      }));
      downloadXLSX(`relatorio_alunos_${formatDate()}.xlsx`, 'Top Alunos', data);
    } else if (activeReport === 'atrasos') {
      const data = overdueLoansList.map((item) => ({
        'Título': item.obra?.titulo || '',
        'Tombo': item.exemplar?.codigo_barras || '',
        'Nome do Leitor': item.reader?.nome || '',
        'Matrícula': item.reader?.matricula || '',
        'Data Retirada': item.loan.data_emprestimo,
        'Data Prevista': item.loan.data_prevista,
        'Dias em Atraso': item.daysOverdue
      }));
      downloadXLSX(`relatorio_atrasos_${formatDate()}.xlsx`, 'Atrasos Atuais', data);
    } else {
      const data = periodFilteredLoans.map((l) => {
        const r = db.leitores.find((reader) => reader.id === l.leitor_id);
        const ex = db.exemplares.find((x) => x.id === l.exemplar_id);
        const o = ex ? db.obras.find((ob) => ob.id === ex.obra_id) : null;
        return {
          'ID': l.id,
          'Obra': o?.titulo || '',
          'Tombo': ex?.codigo_barras || '',
          'Leitor': r?.nome || '',
          'Data Empréstimo': l.data_emprestimo,
          'Data Prevista': l.data_prevista,
          'Data Devolução': l.data_devolucao || 'Pendente',
          'Renovações': l.renovacoes
        };
      });
      downloadXLSX(`relatorio_circulacao_${formatDate()}.xlsx`, 'Circulação', data);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Relatórios & Estatísticas</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Análise de circulação, livros mais/menos emprestados, ranking de alunos por turma e exportações (CSV / XLSX).
          </p>
        </div>

        {/* Real Export Buttons (RF09) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="Exportar dados da visualização atual para arquivo CSV"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleExportXLSX}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="Exportar dados formatados para planilha Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar XLSX (Excel)</span>
          </button>
        </div>
      </div>

      {/* Report Switcher & Period Filter */}
      <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-neutral-950 rounded-xl border border-neutral-800 w-full md:w-auto">
          <button
            onClick={() => setActiveReport('livros')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeReport === 'livros'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            <span>Mais & Menos Emprestados</span>
          </button>

          <button
            onClick={() => setActiveReport('alunos')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeReport === 'alunos'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Alunos com Mais Empréstimos</span>
          </button>

          <button
            onClick={() => setActiveReport('periodo')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeReport === 'periodo'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>Circulação por Período</span>
          </button>

          <button
            onClick={() => setActiveReport('atrasos')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeReport === 'atrasos'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Atrasos Atuais</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Período:</span>
          </div>

          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as any)}
            aria-label="Filtrar período de circulação"
            className="px-2.5 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="todos">Todo o Histórico</option>
            <option value="7dias">Últimos 7 dias</option>
            <option value="30dias">Últimos 30 dias</option>
            <option value="ano">Ano Atual</option>
          </select>

          {activeReport === 'alunos' && (
            <>
              <select
                value={filterAno}
                onChange={(e) => setFilterAno(e.target.value)}
                aria-label="Filtrar por ano escolar"
                className="px-2.5 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="todos">Todos os Anos</option>
                {distinctAnos.map((ano) => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>

              <select
                value={filterSala}
                onChange={(e) => setFilterSala(e.target.value)}
                aria-label="Filtrar por turma/sala"
                className="px-2.5 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="todos">Todas as Salas</option>
                {distinctSalas.map((sala) => (
                  <option key={sala} value={sala}>{sala}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Content: Livros Mais e Menos Emprestados */}
      {activeReport === 'livros' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mais emprestados */}
          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Livros Mais Emprestados</h2>
            </div>

            <div className="space-y-4">
              {mostBorrowed.slice(0, 6).map((item, idx) => {
                const max = mostBorrowed[0]?.totalEmprestimos || 1;
                const pct = Math.round((item.totalEmprestimos / max) * 100);
                return (
                  <div key={item.obra.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-semibold text-white truncate max-w-[280px]">
                        <span className="font-mono text-neutral-500 mr-2">#{idx + 1}</span>
                        {item.obra.titulo}
                      </div>
                      <span className="font-mono font-bold text-indigo-400 tabular-nums">
                        {item.totalEmprestimos} empréstimo{item.totalEmprestimos === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-800">
                      <div
                        style={{ width: `${Math.max(pct, 5)}%` }}
                        className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-neutral-500">
                      <span>{item.obra.autor}</span>
                      <span>{item.totalExemplares} exemplar(es) no acervo</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Menos emprestados (gestão de acervo ocioso) */}
          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-neutral-400" />
              <h2 className="text-sm font-bold text-white">Livros Menos Emprestados (Acervo Ocioso)</h2>
            </div>

            <div className="space-y-3">
              {leastBorrowed.slice(0, 6).map((item) => (
                <div
                  key={item.obra.id}
                  className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-semibold text-white block">{item.obra.titulo}</span>
                    <span className="text-[11px] text-neutral-400">
                      {item.obra.autor} · {item.obra.categoria}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-neutral-400 tabular-nums">
                      {item.totalEmprestimos} retirada{item.totalEmprestimos === 1 ? '' : 's'}
                    </span>
                    <span className="block text-[10px] text-neutral-500">
                      {item.totalExemplares} cópias disponíveis
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content: Alunos Top Leitores */}
      {activeReport === 'alunos' && (
        <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Alunos com Maior Índice de Leitura</h2>
            </div>
            <span className="text-xs text-neutral-400">
              {topStudents.length} aluno(s) contabilizado(s)
            </span>
          </div>

          <div className="rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900/80 text-neutral-400 font-semibold border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-4 text-center">Posição</th>
                  <th className="py-3 px-4">Aluno</th>
                  <th className="py-3 px-4">Matrícula</th>
                  <th className="py-3 px-4">Ano Escolar</th>
                  <th className="py-3 px-4">Turma / Sala</th>
                  <th className="py-3 px-4 text-center">Empréstimos Realizados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {topStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-neutral-500">
                      Nenhum empréstimo registrado para alunos com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  topStudents.map((item, idx) => (
                    <tr key={item.reader.id} className="hover:bg-neutral-800/40">
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {idx === 0 ? (
                          <span className="text-amber-400">🥇 1º</span>
                        ) : idx === 1 ? (
                          <span className="text-neutral-300">🥈 2º</span>
                        ) : idx === 2 ? (
                          <span className="text-amber-600">🥉 3º</span>
                        ) : (
                          <span className="text-neutral-500">{idx + 1}º</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{item.reader.nome}</td>
                      <td className="py-3 px-4 font-mono text-neutral-400">{item.reader.matricula}</td>
                      <td className="py-3 px-4 text-neutral-300">{item.ano}</td>
                      <td className="py-3 px-4 text-neutral-300">{item.sala}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-400 tabular-nums">
                        {item.count} livro{item.count === 1 ? '' : 's'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content: Circulação por Período */}
      {activeReport === 'periodo' && (
        <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Histórico Geral de Circulação</h2>
            <span className="text-xs text-neutral-400 font-mono tabular-nums">
              {periodFilteredLoans.length} registros no período
            </span>
          </div>

          <div className="rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900/80 text-neutral-400 font-semibold border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Obra & Tombo</th>
                  <th className="py-3 px-4">Leitor</th>
                  <th className="py-3 px-4 text-center">Data Empréstimo</th>
                  <th className="py-3 px-4 text-center">Data Prevista</th>
                  <th className="py-3 px-4 text-center">Data Devolução</th>
                  <th className="py-3 px-4 text-center">Renovações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {periodFilteredLoans.map((loan) => {
                  const r = db.leitores.find((reader) => reader.id === loan.leitor_id);
                  const ex = db.exemplares.find((x) => x.id === loan.exemplar_id);
                  const o = ex ? db.obras.find((ob) => ob.id === ex.obra_id) : null;

                  return (
                    <tr key={loan.id} className="hover:bg-neutral-800/40">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">{o?.titulo}</span>
                        <span className="font-mono text-[11px] text-neutral-500">{ex?.codigo_barras}</span>
                      </td>
                      <td className="py-3 px-4 text-neutral-300">{r?.nome}</td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-neutral-400">
                        {loan.data_emprestimo}
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-neutral-400">
                        {loan.data_prevista}
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums">
                        {loan.data_devolucao ? (
                          <span className="text-emerald-400 font-medium">{loan.data_devolucao}</span>
                        ) : (
                          <span className="text-amber-400 font-medium">Em Aberto</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-neutral-400">
                        {loan.renovacoes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content: Atrasos Atuais */}
      {activeReport === 'atrasos' && (
        <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h2 className="text-sm font-bold text-white">Relatório Detalhado de Pendências e Atrasos</h2>
            </div>
            <span className="text-xs text-rose-400 font-semibold font-mono tabular-nums">
              {overdueLoansList.length} itens vencidos
            </span>
          </div>

          <div className="rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900/80 text-neutral-400 font-semibold border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Obra & Tombo</th>
                  <th className="py-3 px-4">Leitor</th>
                  <th className="py-3 px-4">Contato</th>
                  <th className="py-3 px-4 text-center">Data Retirada</th>
                  <th className="py-3 px-4 text-center">Vencimento</th>
                  <th className="py-3 px-4 text-center">Dias em Atraso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {overdueLoansList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-emerald-400 font-medium">
                      Parabéns! Não há nenhum exemplar em atraso no momento.
                    </td>
                  </tr>
                ) : (
                  overdueLoansList.map((item) => (
                    <tr key={item.loan.id} className="hover:bg-neutral-800/40 bg-rose-950/10">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">{item.obra?.titulo}</span>
                        <span className="font-mono text-[11px] text-neutral-500">{item.exemplar?.codigo_barras}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-white block">{item.reader?.nome}</span>
                        <span className="text-[11px] font-mono text-neutral-400">{item.reader?.matricula}</span>
                      </td>
                      <td className="py-3 px-4 text-neutral-300">{item.reader?.contato}</td>
                      <td className="py-3 px-4 text-center font-mono text-neutral-400">{item.loan.data_emprestimo}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-400">{item.loan.data_prevista}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-400 tabular-nums">
                        {item.daysOverdue} dias
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
