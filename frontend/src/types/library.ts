export type TipoLeitorCodigo = 'aluno' | 'professor' | 'publico';
export type TipoMaterial = 'livro' | 'periodico' | 'midia';
export type StatusExemplar = 'disponivel' | 'emprestado' | 'perdido' | 'danificado';

export interface UsuarioAdmin {
  id: string;
  usuario: string;
  senha_hash: string;
  criado_em: string;
}

export interface TipoLeitor {
  id: string;
  codigo: TipoLeitorCodigo;
  nome: string;
  prazo_dias: number;
  limite_emprestimos: number;
  max_renovacoes: number;
}

export interface Leitor {
  id: string;
  nome: string;
  matricula: string;
  tipo_leitor_id: string;
  ano?: string;
  sala?: string;
  contato: string;
  ativo: boolean;
}

export interface Obra {
  id: string;
  titulo: string;
  autor: string;
  editora: string;
  ano_publicacao: number;
  isbn: string;
  categoria: string;
  tipo_material: TipoMaterial;
  ativo: boolean;
}

export interface Exemplar {
  id: string;
  obra_id: string;
  codigo_barras: string;
  status: StatusExemplar;
  observacao?: string;
}

export interface Emprestimo {
  id: string;
  exemplar_id: string;
  leitor_id: string;
  data_emprestimo: string; // ISO String (YYYY-MM-DD)
  data_prevista: string;   // ISO String (YYYY-MM-DD)
  data_devolucao?: string | null; // ISO String se devolvido
  renovacoes: number;
  ano_leitor?: string; // Snapshot no momento do empréstimo
  sala_leitor?: string; // Snapshot no momento do empréstimo
}

export interface LogBackup {
  id: string;
  data: string;
  destino: string;
  status: 'sucesso' | 'erro';
  mensagem: string;
  tamanho_kb: number;
  hash: string;
}

export interface LogImportacao {
  id: string;
  data: string;
  arquivo: string;
  linhas_ok: number;
  linhas_erro: number;
  detalhes: string;
}

export interface DatabaseState {
  admin: UsuarioAdmin;
  tiposLeitor: TipoLeitor[];
  leitores: Leitor[];
  obras: Obra[];
  exemplares: Exemplar[];
  emprestimos: Emprestimo[];
  logsBackup: LogBackup[];
  logsImportacao: LogImportacao[];
}
