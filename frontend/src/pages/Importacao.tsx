import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { DatabaseState, Obra, Exemplar, LogImportacao, TipoMaterial } from '../types/library.ts';
import { saveDatabase, formatDate } from '../services/storage.ts';
import { downloadCSV } from '../services/exportService.ts';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle,
  AlertTriangle,
  Download,
  Check,
  RotateCcw,
  History,
  FileText
} from 'lucide-react';

interface ImportacaoProps {
  db: DatabaseState;
  onUpdateDb: (newDb: DatabaseState) => void;
}

interface ParsedRow {
  index: number;
  titulo: string;
  autor: string;
  editora: string;
  ano: number;
  isbn: string;
  categoria: string;
  tipo_material: string;
  codigo_barras: string;
  isValid: boolean;
  errors: string[];
}

export const Importacao: React.FC<ImportacaoProps> = ({ db, onUpdateDb }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'historico'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importReport, setImportReport] = useState<{
    success: boolean;
    message: string;
    linhasOk: number;
    linhasErro: number;
  } | null>(null);

  // Template sample data to download or load
  const SAMPLE_IMPORT_DATA = [
    {
      titulo: 'Vidas Secas',
      autor: 'Graciliano Ramos',
      editora: 'Record',
      ano: '1938',
      isbn: '978-8501062017',
      categoria: 'Literatura Brasileira',
      tipo_material: 'livro',
      codigo_barras: 'TOMBO-9010'
    },
    {
      titulo: 'Estruturas de Dados e Seus Algoritmos',
      autor: 'Jayme Luiz Szwarcfiter',
      editora: 'LTC',
      ano: '2015',
      isbn: '978-8521629801',
      categoria: 'Ciência da Computação',
      tipo_material: 'livro',
      codigo_barras: 'TOMBO-9020'
    },
    {
      titulo: 'Revista Ciência Hoje - Edição 402',
      autor: 'Instituto Ciência Hoje',
      editora: 'ICH',
      ano: '2024',
      isbn: '0101-8515',
      categoria: 'Periódico Científico',
      tipo_material: 'periodico',
      codigo_barras: 'TOMBO-9030'
    },
    {
      titulo: 'Filme: Ilha das Flores',
      autor: 'Jorge Furtado',
      editora: 'Casa de Cinema de Porto Alegre',
      ano: '1989',
      isbn: 'DVD-CINEMA-01',
      categoria: 'Cinema & Artes',
      tipo_material: 'midia',
      codigo_barras: 'TOMBO-9040'
    }
  ];

  const handleDownloadTemplate = () => {
    downloadCSV('modelo_importacao_acervo.csv', SAMPLE_IMPORT_DATA);
  };

  const handleLoadSample = () => {
    processRawRows('amostra_acervo_educacional.csv', SAMPLE_IMPORT_DATA);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        parseCSVText(file.name, text);
      };
      reader.readAsText(file);
    } else {
      // Excel XLSX
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
          processRawRows(file.name, json);
        } catch {
          alert('Erro ao interpretar a planilha Excel.');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const parseCSVText = (filename: string, text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      alert('O arquivo deve conter pelo menos uma linha de cabeçalho e uma linha de dados.');
      return;
    }

    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());

    const rows: Record<string, unknown>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(separator).map((p) => p.replace(/^"|"$/g, '').trim());
      const row: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        row[h] = parts[idx] || '';
      });
      rows.push(row);
    }

    processRawRows(filename, rows);
  };

  const processRawRows = (fileLabel: string, rawRows: Record<string, unknown>[]) => {
    setFileName(fileLabel);
    setImportReport(null);

    const parsed: ParsedRow[] = rawRows.map((raw, idx) => {
      const errors: string[] = [];

      const titulo = String(raw.titulo || raw.title || '').trim();
      const autor = String(raw.autor || raw.author || '').trim();
      const editora = String(raw.editora || raw.publisher || '').trim() || 'Editora Independente';
      const anoNum = Number(raw.ano || raw.year || 2024);
      const isbn = String(raw.isbn || '').trim() || 'S/N';
      const categoria = String(raw.categoria || raw.category || '').trim() || 'Geral';
      const tipoMaterial = String(raw.tipo_material || raw.tipo || 'livro').toLowerCase().trim();
      const codigoBarras = String(raw.codigo_barras || raw.tombo || `TOMBO-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase().trim();

      if (!titulo) errors.push('Título obrigatório');
      if (!autor) errors.push('Autor obrigatório');
      if (isNaN(anoNum) || anoNum < 1500 || anoNum > 2100) errors.push('Ano inválido');

      // Check if barcode already exists in DB
      const barcodeExists = db.exemplares.some(
        (ex) => ex.codigo_barras.toLowerCase() === codigoBarras.toLowerCase()
      );
      if (barcodeExists) {
        errors.push(`Tombo "${codigoBarras}" já cadastrado no banco`);
      }

      return {
        index: idx + 1,
        titulo,
        autor,
        editora,
        ano: anoNum,
        isbn,
        categoria,
        tipo_material: ['livro', 'periodico', 'midia'].includes(tipoMaterial) ? tipoMaterial : 'livro',
        codigo_barras: codigoBarras,
        isValid: errors.length === 0,
        errors
      };
    });

    setParsedRows(parsed);
  };

  // Transactional import execution (RF08 & Section 11)
  const handleConfirmImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    const invalidRows = parsedRows.filter((r) => !r.isValid);

    if (validRows.length === 0) {
      alert('Não há linhas válidas para importar.');
      return;
    }

    try {
      const newObras: Obra[] = [];
      const newExemplares: Exemplar[] = [];

      validRows.forEach((row) => {
        const obraId = 'obra-imp-' + Date.now() + '-' + row.index;
        const obra: Obra = {
          id: obraId,
          titulo: row.titulo,
          autor: row.autor,
          editora: row.editora,
          ano_publicacao: row.ano,
          isbn: row.isbn,
          categoria: row.categoria,
          tipo_material: row.tipo_material as TipoMaterial,
          ativo: true
        };
        newObras.push(obra);

        const exemplar: Exemplar = {
          id: 'ex-imp-' + Date.now() + '-' + row.index,
          obra_id: obraId,
          codigo_barras: row.codigo_barras,
          status: 'disponivel'
        };
        newExemplares.push(exemplar);
      });

      // Audit Log (log_importacao)
      const importLog: LogImportacao = {
        id: 'imp-' + Date.now(),
        data: formatDate() + ' ' + new Date().toLocaleTimeString('pt-BR'),
        arquivo: fileName || 'lote_manual.csv',
        linhas_ok: validRows.length,
        linhas_erro: invalidRows.length,
        detalhes: `Importadas ${validRows.length} novas obras e exemplares com sucesso.`
      };

      const nextDb: DatabaseState = {
        ...db,
        obras: [...newObras, ...db.obras],
        exemplares: [...newExemplares, ...db.exemplares],
        logsImportacao: [importLog, ...db.logsImportacao]
      };

      saveDatabase(nextDb);
      onUpdateDb(nextDb);

      setImportReport({
        success: true,
        message: `Importação transacional concluída com sucesso! ${validRows.length} itens gravados no acervo.`,
        linhasOk: validRows.length,
        linhasErro: invalidRows.length
      });
      setParsedRows([]);
    } catch {
      alert('Erro ao processar transação de importação. Nenhuma linha foi gravada.');
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Importação do Acervo (CSV / XLSX)</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Importação em lote de livros e exemplares com validação de formato, prévia visual e gravação transacional.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Importar Arquivo
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'historico'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico de Logs ({db.logsImportacao.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'upload' ? (
        <div className="space-y-6">
          {/* Success banner if finished */}
          {importReport && (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 flex items-start justify-between gap-3 text-xs text-emerald-200">
              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-white font-semibold">Sucesso</strong>
                  <span>{importReport.message}</span>
                </div>
              </div>
              <button
                onClick={() => setImportReport(null)}
                className="text-neutral-400 hover:text-white"
              >
                ×
              </button>
            </div>
          )}

          {/* Upload Dropzone & Sample Buttons */}
          <div className="p-8 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-indigo-400 flex items-center justify-center mb-4">
              <Upload className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              Selecione o arquivo de acervo (CSV ou Planilha Excel .XLSX)
            </h3>
            <p className="text-xs text-neutral-400 max-w-md mb-6 leading-relaxed">
              O sistema validará as colunas obrigatórias (<code className="font-mono text-neutral-300">titulo</code>, <code className="font-mono text-neutral-300">autor</code>, <code className="font-mono text-neutral-300">ano</code>, <code className="font-mono text-neutral-300">codigo_barras</code>) antes de gravar no banco de dados.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer shadow-sm active:scale-95 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Escolher Arquivo do Computador</span>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleLoadSample}
                className="px-4 py-2.5 text-xs font-medium text-neutral-300 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Carregar Amostra de Teste</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-4 py-2.5 text-xs font-medium text-neutral-300 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Baixar Modelo CSV</span>
              </button>
            </div>
          </div>

          {/* Preview Grid (Section 11) */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
                <div>
                  <span className="text-xs font-semibold text-white">
                    Prévia de Importação: <span className="font-mono text-indigo-400">{fileName}</span>
                  </span>
                  <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                    <span className="text-emerald-400 font-semibold">{validCount} linhas válidas</span>
                    <span aria-hidden="true">·</span>
                    <span className={errorCount > 0 ? 'text-rose-400 font-semibold' : 'text-neutral-400'}>
                      {errorCount} com aviso/erro
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setParsedRows([])}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={validCount === 0}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirmar Importação Transacional ({validCount})</span>
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-950/80 text-neutral-400 font-semibold border-b border-neutral-800">
                      <tr>
                        <th className="py-3 px-4 text-center">#</th>
                        <th className="py-3 px-4">Título</th>
                        <th className="py-3 px-4">Autor</th>
                        <th className="py-3 px-4">Editora</th>
                        <th className="py-3 px-4 text-center">Ano</th>
                        <th className="py-3 px-4">Tipo</th>
                        <th className="py-3 px-4">Tombo</th>
                        <th className="py-3 px-4 text-center">Status Validação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {parsedRows.map((row) => (
                        <tr
                          key={row.index}
                          className={`hover:bg-neutral-800/40 transition-colors ${
                            !row.isValid ? 'bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-center font-mono text-neutral-500">
                            {row.index}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">
                            {row.titulo || <span className="text-rose-400">Vazio</span>}
                          </td>
                          <td className="py-3 px-4 text-neutral-300">
                            {row.autor || <span className="text-rose-400">Vazio</span>}
                          </td>
                          <td className="py-3 px-4 text-neutral-400">{row.editora}</td>
                          <td className="py-3 px-4 text-center font-mono tabular-nums text-neutral-300">
                            {row.ano}
                          </td>
                          <td className="py-3 px-4 capitalize text-neutral-300">{row.tipo_material}</td>
                          <td className="py-3 px-4 font-mono text-indigo-300">{row.codigo_barras}</td>
                          <td className="py-3 px-4 text-center">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Válida</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] text-rose-400"
                                title={row.errors.join('; ')}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>{row.errors[0]}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* History of Imports (log_importacao) */
        <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 overflow-hidden">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Registro de Auditoria de Importações</span>
            <span className="text-[11px] text-neutral-400 font-mono">Tabela log_importacao</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/80 text-neutral-400 font-semibold border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Data & Hora</th>
                  <th className="py-3 px-4">Nome do Arquivo</th>
                  <th className="py-3 px-4 text-center">Linhas OK</th>
                  <th className="py-3 px-4 text-center">Linhas com Erro</th>
                  <th className="py-3 px-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {db.logsImportacao.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-800/40">
                    <td className="py-3.5 px-4 font-mono text-neutral-300">{log.data}</td>
                    <td className="py-3.5 px-4 font-medium text-white">{log.arquivo}</td>
                    <td className="py-3.5 px-4 text-center font-mono tabular-nums text-emerald-400 font-bold">
                      {log.linhas_ok}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono tabular-nums text-neutral-400">
                      {log.linhas_erro}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400">{log.detalhes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
