import React, { useState } from 'react';
import { DatabaseState, Obra, Exemplar, TipoMaterial, StatusExemplar } from '../types/library.ts';
import { saveDatabase } from '../services/storage.ts';
import {
  Search,
  Plus,
  BookOpen,
  Layers,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  AlertCircle,
  Barcode
} from 'lucide-react';

interface AcervoProps {
  db: DatabaseState;
  onUpdateDb: (newDb: DatabaseState) => void;
}

export const Acervo: React.FC<AcervoProps> = ({ db, onUpdateDb }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterActive, setFilterActive] = useState<string>('ativos');

  // Modal states
  const [isObraModalOpen, setIsObraModalOpen] = useState(false);
  const [editingObra, setEditingObra] = useState<Obra | null>(null);

  // Form fields for Obra
  const [titulo, setTitulo] = useState('');
  const [autor, setAutor] = useState('');
  const [editora, setEditora] = useState('');
  const [anoPublicacao, setAnoPublicacao] = useState<number>(new Date().getFullYear());
  const [isbn, setIsbn] = useState('');
  const [categoria, setCategoria] = useState('');
  const [tipoMaterial, setTipoMaterial] = useState<TipoMaterial>('livro');

  // Exemplares modal state
  const [selectedObraForExemplares, setSelectedObraForExemplares] = useState<Obra | null>(null);
  const [newExemplarBarcode, setNewExemplarBarcode] = useState('');
  const [newExemplarStatus, setNewExemplarStatus] = useState<StatusExemplar>('disponivel');

  // Filter obras
  const filteredObras = db.obras.filter((o) => {
    const matchSearch =
      o.titulo.toLowerCase().includes(search.toLowerCase()) ||
      o.autor.toLowerCase().includes(search.toLowerCase()) ||
      o.isbn.toLowerCase().includes(search.toLowerCase()) ||
      o.categoria.toLowerCase().includes(search.toLowerCase());

    const matchType = filterType === 'todos' || o.tipo_material === filterType;
    const matchActive =
      filterActive === 'todos' ||
      (filterActive === 'ativos' && o.ativo) ||
      (filterActive === 'inativos' && !o.ativo);

    return matchSearch && matchType && matchActive;
  });

  const openNewObraModal = () => {
    setEditingObra(null);
    setTitulo('');
    setAutor('');
    setEditora('');
    setAnoPublicacao(new Date().getFullYear());
    setIsbn('');
    setCategoria('Literatura');
    setTipoMaterial('livro');
    setIsObraModalOpen(true);
  };

  const openEditObraModal = (obra: Obra) => {
    setEditingObra(obra);
    setTitulo(obra.titulo);
    setAutor(obra.autor);
    setEditora(obra.editora);
    setAnoPublicacao(obra.ano_publicacao);
    setIsbn(obra.isbn);
    setCategoria(obra.categoria);
    setTipoMaterial(obra.tipo_material);
    setIsObraModalOpen(true);
  };

  const handleSaveObra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !autor.trim()) return;

    let updatedObras: Obra[];

    if (editingObra) {
      updatedObras = db.obras.map((o) =>
        o.id === editingObra.id
          ? {
              ...o,
              titulo: titulo.trim(),
              autor: autor.trim(),
              editora: editora.trim(),
              ano_publicacao: Number(anoPublicacao),
              isbn: isbn.trim(),
              categoria: categoria.trim(),
              tipo_material: tipoMaterial
            }
          : o
      );
    } else {
      const newObra: Obra = {
        id: 'obra-' + Date.now(),
        titulo: titulo.trim(),
        autor: autor.trim(),
        editora: editora.trim(),
        ano_publicacao: Number(anoPublicacao),
        isbn: isbn.trim() || 'S/N',
        categoria: categoria.trim() || 'Geral',
        tipo_material: tipoMaterial,
        ativo: true
      };
      updatedObras = [newObra, ...db.obras];

      let updatedExemplares = db.exemplares;
      // Automatically add one initial copy
      const nextBarcode = `TOMBO-${Math.floor(1000 + Math.random() * 9000)}`;
      const initialCopy: Exemplar = {
        id: 'ex-' + Date.now(),
        obra_id: newObra.id,
        codigo_barras: nextBarcode,
        status: 'disponivel'
      };
      updatedExemplares = [...db.exemplares, initialCopy];
      const nextDb = { ...db, obras: updatedObras, exemplares: updatedExemplares };
      saveDatabase(nextDb);
      onUpdateDb(nextDb);
      setIsObraModalOpen(false);
      return;
    }

    const nextDb = { ...db, obras: updatedObras };
    saveDatabase(nextDb);
    onUpdateDb(nextDb);
    setIsObraModalOpen(false);
  };

  const toggleObraStatus = (obra: Obra) => {
    const updatedObras = db.obras.map((o) =>
      o.id === obra.id ? { ...o, ativo: !o.ativo } : o
    );
    const nextDb = { ...db, obras: updatedObras };
    saveDatabase(nextDb);
    onUpdateDb(nextDb);
  };

  // Exemplares handlers
  const openExemplaresModal = (obra: Obra) => {
    setSelectedObraForExemplares(obra);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setNewExemplarBarcode(`TOMBO-${randomSuffix}`);
    setNewExemplarStatus('disponivel');
  };

  const handleAddExemplar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObraForExemplares || !newExemplarBarcode.trim()) return;

    // Barcode must be unique (Section 6)
    const exists = db.exemplares.some(
      (ex) => ex.codigo_barras.toLowerCase() === newExemplarBarcode.trim().toLowerCase()
    );
    if (exists) {
      alert('Já existe um exemplar cadastrado com este código de barras/tombo.');
      return;
    }

    const newCopy: Exemplar = {
      id: 'ex-' + Date.now(),
      obra_id: selectedObraForExemplares.id,
      codigo_barras: newExemplarBarcode.trim().toUpperCase(),
      status: newExemplarStatus
    };

    const nextDb = {
      ...db,
      exemplares: [...db.exemplares, newCopy]
    };
    saveDatabase(nextDb);
    onUpdateDb(nextDb);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setNewExemplarBarcode(`TOMBO-${randomSuffix}`);
  };

  const handleUpdateExemplarStatus = (exemplarId: string, status: StatusExemplar) => {
    // If setting to available, ensure it's not in an active loan
    const hasActiveLoan = db.emprestimos.some(
      (emp) => emp.exemplar_id === exemplarId && !emp.data_devolucao
    );
    if (hasActiveLoan && status === 'disponivel') {
      alert('Este exemplar possui um empréstimo em aberto. Faça a devolução no balcão.');
      return;
    }

    const nextDb = {
      ...db,
      exemplares: db.exemplares.map((ex) =>
        ex.id === exemplarId ? { ...ex, status } : ex
      )
    };
    saveDatabase(nextDb);
    onUpdateDb(nextDb);
  };

  const handleDeleteExemplar = (exemplarId: string) => {
    const hasLoan = db.emprestimos.some((emp) => emp.exemplar_id === exemplarId);
    if (hasLoan) {
      alert('Não é possível excluir um exemplar que possui histórico de empréstimo. Altere o status para "perdido" ou "danificado".');
      return;
    }
    const nextDb = {
      ...db,
      exemplares: db.exemplares.filter((ex) => ex.id !== exemplarId)
    };
    saveDatabase(nextDb);
    onUpdateDb(nextDb);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Acervo Bibliográfico</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Cadastro de obras, periódicos, mídias e controle de exemplares físicos (tombo/código de barras).
          </p>
        </div>

        <button
          onClick={openNewObraModal}
          className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Nova Obra</span>
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
            placeholder="Buscar por título, autor, ISBN ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            aria-label="Filtrar por tipo de material"
            className="px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="livro">Livro</option>
            <option value="periodico">Periódico</option>
            <option value="midia">Mídia / DVD</option>
          </select>

          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            aria-label="Filtrar por status da obra"
            className="px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ativos">Obras Ativas</option>
            <option value="inativos">Obras Inativas</option>
            <option value="todos">Todas</option>
          </select>
        </div>
      </div>

      {/* Obras Table */}
      <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 text-neutral-400 font-semibold border-b border-neutral-800">
              <tr>
                <th className="py-3 px-4">Título & Autor</th>
                <th className="py-3 px-4">Tipo & Categoria</th>
                <th className="py-3 px-4">ISBN</th>
                <th className="py-3 px-4 text-center">Ano</th>
                <th className="py-3 px-4 text-center">Exemplares</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredObras.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    Nenhuma obra encontrada com os critérios informados.
                  </td>
                </tr>
              ) : (
                filteredObras.map((obra) => {
                  const obraExemplares = db.exemplares.filter((e) => e.obra_id === obra.id);
                  const dispCount = obraExemplares.filter((e) => e.status === 'disponivel').length;

                  return (
                    <tr
                      key={obra.id}
                      className={`hover:bg-neutral-800/40 transition-colors ${!obra.ativo ? 'opacity-60' : ''}`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{obra.titulo}</div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {obra.autor} <span aria-hidden="true">·</span> {obra.editora}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="capitalize font-medium text-neutral-300 block">{obra.tipo_material}</span>
                        <span className="text-[11px] text-neutral-400">{obra.categoria}</span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-neutral-300">
                        {obra.isbn}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono tabular-nums text-neutral-300">
                        {obra.ano_publicacao}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-semibold tabular-nums text-sky-400">
                          {dispCount}
                        </span>
                        <span className="text-neutral-400 font-mono"> / {obraExemplares.length}</span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {obra.ativo ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Ativa</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Inativa</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openExemplaresModal(obra)}
                            className="px-2.5 py-1 text-xs font-medium text-sky-300 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="Gerenciar exemplares"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Exemplares ({obraExemplares.length})</span>
                          </button>

                          <button
                            onClick={() => openEditObraModal(obra)}
                            className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                            title="Editar obra"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => toggleObraStatus(obra)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              obra.ativo
                                ? 'bg-neutral-950 hover:bg-rose-950/60 border-neutral-800 text-neutral-400 hover:text-rose-400'
                                : 'bg-neutral-950 hover:bg-emerald-950/60 border-neutral-800 text-neutral-400 hover:text-emerald-400'
                            }`}
                            title={obra.ativo ? 'Inativar obra' : 'Reativar obra'}
                          >
                            {obra.ativo ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
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

      {/* Modal: Nova / Editar Obra */}
      {isObraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-5">
              <h3 className="text-base font-bold text-white">
                {editingObra ? 'Editar Obra' : 'Cadastrar Nova Obra no Acervo'}
              </h3>
              <button
                onClick={() => setIsObraModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveObra} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Título da Obra *
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Dom Casmurro"
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Autor(es) *
                  </label>
                  <input
                    type="text"
                    required
                    value={autor}
                    onChange={(e) => setAutor(e.target.value)}
                    placeholder="Ex: Machado de Assis"
                    className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Editora
                  </label>
                  <input
                    type="text"
                    value={editora}
                    onChange={(e) => setEditora(e.target.value)}
                    placeholder="Ex: Companhia das Letras"
                    className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Ano Publicação
                  </label>
                  <input
                    type="number"
                    value={anoPublicacao}
                    onChange={(e) => setAnoPublicacao(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Tipo de Material
                  </label>
                  <select
                    value={tipoMaterial}
                    onChange={(e) => setTipoMaterial(e.target.value as TipoMaterial)}
                    className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="livro">Livro</option>
                    <option value="periodico">Periódico</option>
                    <option value="midia">Mídia / DVD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    placeholder="Ex: Literatura"
                    className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  ISBN / Código Identificador
                </label>
                <input
                  type="text"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="Ex: 978-8572329381"
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsObraModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
                >
                  {editingObra ? 'Salvar Alterações' : 'Salvar Obra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gerenciar Exemplares da Obra (RF03) */}
      {selectedObraForExemplares && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-5">
              <div>
                <h3 className="text-base font-bold text-white">
                  Exemplares: {selectedObraForExemplares.titulo}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Controle de tombo/código de barras e status físico de cada cópia.
                </p>
              </div>
              <button
                onClick={() => setSelectedObraForExemplares(null)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form: Add New Copy */}
            <form onSubmit={handleAddExemplar} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 mb-6">
              <span className="text-xs font-semibold text-white block mb-3">
                Cadastrar Novo Exemplar Físico
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-6">
                  <label className="block text-[11px] text-neutral-400 mb-1">
                    Código de Barras / Tombo *
                  </label>
                  <div className="relative">
                    <Barcode className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
                    <input
                      type="text"
                      required
                      value={newExemplarBarcode}
                      onChange={(e) => setNewExemplarBarcode(e.target.value)}
                      placeholder="TOMBO-XXXX"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] text-neutral-400 mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={newExemplarStatus}
                    onChange={(e) => setNewExemplarStatus(e.target.value as StatusExemplar)}
                    className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="disponivel">Disponível</option>
                    <option value="danificado">Danificado</option>
                    <option value="perdido">Perdido</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    className="w-full py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Existing Copies List */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {db.exemplares
                .filter((ex) => ex.obra_id === selectedObraForExemplares.id)
                .map((exemplar) => {
                  const activeLoan = db.emprestimos.find(
                    (e) => e.exemplar_id === exemplar.id && !e.data_devolucao
                  );
                  const reader = activeLoan ? db.leitores.find((l) => l.id === activeLoan.leitor_id) : null;

                  return (
                    <div
                      key={exemplar.id}
                      className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{exemplar.codigo_barras}</span>
                          {activeLoan && (
                            <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded">
                              Emprestado para {reader?.nome}
                            </span>
                          )}
                        </div>
                        {exemplar.observacao && (
                          <p className="text-[11px] text-neutral-400 mt-0.5">{exemplar.observacao}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={exemplar.status}
                          disabled={!!activeLoan}
                          onChange={(e) =>
                            handleUpdateExemplarStatus(exemplar.id, e.target.value as StatusExemplar)
                          }
                          aria-label={`Alterar status do exemplar ${exemplar.codigo_barras}`}
                          className={`px-2.5 py-1 text-xs rounded-lg border focus:outline-none cursor-pointer ${
                            exemplar.status === 'disponivel'
                              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                              : exemplar.status === 'emprestado'
                              ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                              : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                          }`}
                        >
                          <option value="disponivel">Disponível</option>
                          <option value="emprestado" disabled>Emprestado</option>
                          <option value="danificado">Danificado</option>
                          <option value="perdido">Perdido</option>
                        </select>

                        {!activeLoan && (
                          <button
                            onClick={() => handleDeleteExemplar(exemplar.id)}
                            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-rose-400 transition-colors"
                            title="Remover exemplar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
