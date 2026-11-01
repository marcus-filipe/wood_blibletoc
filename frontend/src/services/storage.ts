import {
  DatabaseState,
  Obra,
  Exemplar,
  Leitor,
  TipoLeitor,
  Emprestimo,
  LogBackup,
  LogImportacao,
  StatusExemplar
} from '../types/library.ts';

const STORAGE_KEY = 'BIBLIOTECA_LOCAL_DB_V1';

// Format date as YYYY-MM-DD
export function formatDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

// Add days to a date string YYYY-MM-DD
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

// Check if a loan is overdue
export function isOverdue(loan: Emprestimo, today: string = formatDate()): boolean {
  if (loan.data_devolucao) return false;
  return loan.data_prevista < today;
}

// Initial default policies (Section 7.5)
const INITIAL_TIPOS_LEITOR: TipoLeitor[] = [
  {
    id: 'tipo-aluno',
    codigo: 'aluno',
    nome: 'Aluno',
    prazo_dias: 7,
    limite_emprestimos: 3,
    max_renovacoes: 2
  },
  {
    id: 'tipo-professor',
    codigo: 'professor',
    nome: 'Professor',
    prazo_dias: 15,
    limite_emprestimos: 5,
    max_renovacoes: 3
  },
  {
    id: 'tipo-publico',
    codigo: 'publico',
    nome: 'Público Geral',
    prazo_dias: 7,
    limite_emprestimos: 2,
    max_renovacoes: 1
  }
];

// Initial pre-seeded database
function getInitialData(): DatabaseState {
  const today = formatDate();
  const past5Days = addDays(today, -5);
  const past12Days = addDays(today, -12);
  const past20Days = addDays(today, -20);
  const past30Days = addDays(today, -30);

  const initialObras: Obra[] = [
    {
      id: 'obra-1',
      titulo: 'Dom Casmurro',
      autor: 'Machado de Assis',
      editora: 'Garnier',
      ano_publicacao: 1899,
      isbn: '978-8572329381',
      categoria: 'Literatura Brasileira',
      tipo_material: 'livro',
      ativo: true
    },
    {
      id: 'obra-2',
      titulo: 'Algoritmos: Teoria e Prática',
      autor: 'Thomas H. Cormen, Charles E. Leiserson',
      editora: 'Campus / Elsevier',
      ano_publicacao: 2012,
      isbn: '978-8535236995',
      categoria: 'Ciência da Computação',
      tipo_material: 'livro',
      ativo: true
    },
    {
      id: 'obra-3',
      titulo: 'Cálculo com Geometria Analítica - Vol. 1',
      autor: 'James Stewart',
      editora: 'Cengage Learning',
      ano_publicacao: 2016,
      isbn: '978-8522112586',
      categoria: 'Matemática e Exatas',
      tipo_material: 'livro',
      ativo: true
    },
    {
      id: 'obra-4',
      titulo: 'Engenharia de Software: Uma Abordagem Profissional',
      autor: 'Roger S. Pressman, Bruce R. Maxim',
      editora: 'AMGH',
      ano_publicacao: 2016,
      isbn: '978-8580555332',
      categoria: 'Ciência da Computação',
      tipo_material: 'livro',
      ativo: true
    },
    {
      id: 'obra-5',
      titulo: 'Memórias Póstumas de Brás Cubas',
      autor: 'Machado de Assis',
      editora: 'Companhia das Letras',
      ano_publicacao: 1881,
      isbn: '978-8535924848',
      categoria: 'Literatura Brasileira',
      tipo_material: 'livro',
      ativo: true
    },
    {
      id: 'obra-6',
      titulo: 'Revista Brasileira de Computação Aplicada (RBCA)',
      autor: 'Sociedade Brasileira de Computação',
      editora: 'SBC Editora',
      ano_publicacao: 2024,
      isbn: '2176-6649',
      categoria: 'Periódico Científico',
      tipo_material: 'periodico',
      ativo: true
    },
    {
      id: 'obra-7',
      titulo: 'Física Clássica: Mecânica e Termologia',
      autor: 'Halliday & Resnick',
      editora: 'LTC',
      ano_publicacao: 2018,
      isbn: '978-8521630357',
      categoria: 'Física',
      tipo_material: 'livro',
      ativo: true
    },
    {
      id: 'obra-8',
      titulo: 'Documentário: História da Escrita e da Prensa de Gutenberg',
      autor: 'BBC Documentaries',
      editora: 'BBC Cultural',
      ano_publicacao: 2020,
      isbn: 'DVD-HIST-082',
      categoria: 'História',
      tipo_material: 'midia',
      ativo: true
    }
  ];

  const initialExemplares: Exemplar[] = [
    // Dom Casmurro (3 exemplares)
    { id: 'ex-101', obra_id: 'obra-1', codigo_barras: 'TOMBO-1001', status: 'disponivel' },
    { id: 'ex-102', obra_id: 'obra-1', codigo_barras: 'TOMBO-1002', status: 'emprestado' },
    { id: 'ex-103', obra_id: 'obra-1', codigo_barras: 'TOMBO-1003', status: 'disponivel' },

    // Algoritmos (2 exemplares)
    { id: 'ex-201', obra_id: 'obra-2', codigo_barras: 'TOMBO-2001', status: 'emprestado' },
    { id: 'ex-202', obra_id: 'obra-2', codigo_barras: 'TOMBO-2002', status: 'disponivel' },

    // Stewart (3 exemplares)
    { id: 'ex-301', obra_id: 'obra-3', codigo_barras: 'TOMBO-3001', status: 'disponivel' },
    { id: 'ex-302', obra_id: 'obra-3', codigo_barras: 'TOMBO-3002', status: 'emprestado' },
    { id: 'ex-303', obra_id: 'obra-3', codigo_barras: 'TOMBO-3003', status: 'danificado', observacao: 'Capa danificada' },

    // Pressman (2 exemplares)
    { id: 'ex-401', obra_id: 'obra-4', codigo_barras: 'TOMBO-4001', status: 'disponivel' },
    { id: 'ex-402', obra_id: 'obra-4', codigo_barras: 'TOMBO-4002', status: 'disponivel' },

    // Brás Cubas (2 exemplares)
    { id: 'ex-501', obra_id: 'obra-5', codigo_barras: 'TOMBO-5001', status: 'disponivel' },
    { id: 'ex-502', obra_id: 'obra-5', codigo_barras: 'TOMBO-5002', status: 'emprestado' },

    // Revista SBC (1 exemplar)
    { id: 'ex-601', obra_id: 'obra-6', codigo_barras: 'TOMBO-6001', status: 'disponivel' },

    // Física Halliday (2 exemplares)
    { id: 'ex-701', obra_id: 'obra-7', codigo_barras: 'TOMBO-7001', status: 'disponivel' },
    { id: 'ex-702', obra_id: 'obra-7', codigo_barras: 'TOMBO-7002', status: 'disponivel' },

    // DVD Documentário (1 exemplar)
    { id: 'ex-801', obra_id: 'obra-8', codigo_barras: 'TOMBO-8001', status: 'disponivel' }
  ];

  const initialLeitores: Leitor[] = [
    {
      id: 'lei-1',
      nome: 'Lucas Silva Pereira',
      matricula: '2024-ENG-042',
      tipo_leitor_id: 'tipo-aluno',
      ano: '2º Ano',
      sala: 'Turma A',
      contato: 'lucas.silva@email.com / (11) 98765-4321',
      ativo: true
    },
    {
      id: 'lei-2',
      nome: 'Beatriz Costa Miranda',
      matricula: '2023-LET-118',
      tipo_leitor_id: 'tipo-aluno',
      ano: '3º Ano',
      sala: 'Turma B',
      contato: 'beatriz.costa@email.com / (11) 97654-3210',
      ativo: true
    },
    {
      id: 'lei-3',
      nome: 'Prof. Carlos Eduardo Mendes',
      matricula: 'PROF-1089',
      tipo_leitor_id: 'tipo-professor',
      contato: 'carlos.mendes@universidade.edu.br',
      ativo: true
    },
    {
      id: 'lei-4',
      nome: 'Mariana Duarte Ramos',
      matricula: 'PUB-4402',
      tipo_leitor_id: 'tipo-publico',
      contato: 'mariana.duarte@gmail.com / (11) 99123-4567',
      ativo: true
    },
    {
      id: 'lei-5',
      nome: 'Gabriel Antunes Prado',
      matricula: '2024-MAT-015',
      tipo_leitor_id: 'tipo-aluno',
      ano: '1º Ano',
      sala: 'Turma C',
      contato: 'gabriel.antunes@email.com',
      ativo: true
    }
  ];

  const initialEmprestimos: Emprestimo[] = [
    // Empréstimo em dia: Lucas emprestou Stewart
    {
      id: 'emp-1',
      exemplar_id: 'ex-302',
      leitor_id: 'lei-1',
      data_emprestimo: past5Days,
      data_prevista: addDays(past5Days, 7), // ainda no prazo (+2 dias)
      data_devolucao: null,
      renovacoes: 0,
      ano_leitor: '2º Ano',
      sala_leitor: 'Turma A'
    },
    // Empréstimo EM ATRASO: Beatriz emprestou Dom Casmurro há 12 dias (prazo aluno: 7 dias => venceu há 5 dias!)
    {
      id: 'emp-2',
      exemplar_id: 'ex-102',
      leitor_id: 'lei-2',
      data_emprestimo: past12Days,
      data_prevista: addDays(past12Days, 7), // Venceu há 5 dias!
      data_devolucao: null,
      renovacoes: 0,
      ano_leitor: '3º Ano',
      sala_leitor: 'Turma B'
    },
    // Empréstimo em dia: Prof Carlos emprestou Algoritmos Cormen
    {
      id: 'emp-3',
      exemplar_id: 'ex-201',
      leitor_id: 'lei-3',
      data_emprestimo: past5Days,
      data_prevista: addDays(past5Days, 15), // Prazo prof: 15 dias (+10 dias restantes)
      data_devolucao: null,
      renovacoes: 0,
      ano_leitor: undefined,
      sala_leitor: undefined
    },
    // Empréstimo EM ATRASO: Mariana Duarte emprestou Brás Cubas há 20 dias (prazo público: 7 dias => venceu há 13 dias!)
    {
      id: 'emp-4',
      exemplar_id: 'ex-502',
      leitor_id: 'lei-4',
      data_emprestimo: past20Days,
      data_prevista: addDays(past20Days, 7), // Venceu há 13 dias!
      data_devolucao: null,
      renovacoes: 0,
      ano_leitor: undefined,
      sala_leitor: undefined
    },
    // Empréstimo já devolvido no passado (para estatísticas e histórico)
    {
      id: 'emp-5',
      exemplar_id: 'ex-101',
      leitor_id: 'lei-1',
      data_emprestimo: past30Days,
      data_prevista: addDays(past30Days, 7),
      data_devolucao: addDays(past30Days, 6),
      renovacoes: 0,
      ano_leitor: '2º Ano',
      sala_leitor: 'Turma A'
    },
    {
      id: 'emp-6',
      exemplar_id: 'ex-202',
      leitor_id: 'lei-2',
      data_emprestimo: past30Days,
      data_prevista: addDays(past30Days, 7),
      data_devolucao: addDays(past30Days, 5),
      renovacoes: 0,
      ano_leitor: '3º Ano',
      sala_leitor: 'Turma B'
    }
  ];

  const initialLogsBackup: LogBackup[] = [
    {
      id: 'bkp-1',
      data: addDays(today, -2) + ' 18:30:00',
      destino: '/media/hdd_externo/backups/biblioteca_20261024_1830.db',
      status: 'sucesso',
      mensagem: 'Backup realizado com sucesso no disco rígido externo.',
      tamanho_kb: 142.8,
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    }
  ];

  const initialLogsImportacao: LogImportacao[] = [
    {
      id: 'imp-1',
      data: addDays(today, -10) + ' 09:15:00',
      arquivo: 'lote_inicial_literatura_2026.csv',
      linhas_ok: 8,
      linhas_erro: 0,
      detalhes: 'Importação inicial de acervo realizada com sucesso.'
    }
  ];

  return {
    admin: {
      id: 'admin-1',
      usuario: 'admin',
      senha_hash: 'admin123', // Padrão inicial editável
      criado_em: addDays(today, -60)
    },
    tiposLeitor: INITIAL_TIPOS_LEITOR,
    leitores: initialLeitores,
    obras: initialObras,
    exemplares: initialExemplares,
    emprestimos: initialEmprestimos,
    logsBackup: initialLogsBackup,
    logsImportacao: initialLogsImportacao
  };
}

// Load database state
export function loadDatabase(): DatabaseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialData();
      saveDatabase(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    const initial = getInitialData();
    saveDatabase(initial);
    return initial;
  }
}

// Save database state
export function saveDatabase(state: DatabaseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Erro ao salvar no storage local:', err);
  }
}

// Reset database to initial sample
export function resetDatabase(): DatabaseState {
  const initial = getInitialData();
  saveDatabase(initial);
  return initial;
}

// ==========================================
// Regras de Negócio Estritas (Seção 7 do Documento de Arquitetura)
// ==========================================

export interface LoanValidationResult {
  allowed: boolean;
  reason?: string;
  reader?: Leitor;
  exemplar?: Exemplar;
  obra?: Obra;
  policy?: TipoLeitor;
  currentOpenLoansCount?: number;
}

/**
 * Validação rigorosa de empréstimo (Seção 7.1)
 * Condições:
 * 1. Leitor está ativo.
 * 2. Exemplar está com status 'disponivel'.
 * 3. Leitor não possui nenhum empréstimo em atraso.
 * 4. Leitor não atingiu o limite de itens do seu tipo.
 */
export function validateNewLoan(
  db: DatabaseState,
  leitorId: string,
  exemplarId: string
): LoanValidationResult {
  const reader = db.leitores.find((l) => l.id === leitorId);
  if (!reader) {
    return { allowed: false, reason: 'Leitor não encontrado no sistema.' };
  }

  // 1. Leitor ativo
  if (!reader.ativo) {
    return { allowed: false, reason: 'Cadastro do leitor está inativo.', reader };
  }

  const policy = db.tiposLeitor.find((t) => t.id === reader.tipo_leitor_id) || db.tiposLeitor[0];

  // 3. Verifica se leitor possui algum empréstimo em atraso
  const readerOpenLoans = db.emprestimos.filter(
    (e) => e.leitor_id === reader.id && !e.data_devolucao
  );

  const overdueLoan = readerOpenLoans.find((loan) => isOverdue(loan));
  if (overdueLoan) {
    const overdueEx = db.exemplares.find((x) => x.id === overdueLoan.exemplar_id);
    const overdueObra = overdueEx ? db.obras.find((o) => o.id === overdueEx.obra_id) : null;
    const bookTitle = overdueObra ? overdueObra.titulo : 'Item';
    return {
      allowed: false,
      reason: `BLOQUEIO DE ATRASO: O leitor possui o item "${bookTitle}" em atraso (vencido em ${overdueLoan.data_prevista}). Devolva-o para liberar novos empréstimos.`,
      reader,
      policy
    };
  }

  // 4. Limite de itens
  if (readerOpenLoans.length >= policy.limite_emprestimos) {
    return {
      allowed: false,
      reason: `LIMITE ATINGIDO: O tipo "${policy.nome}" permite no máximo ${policy.limite_emprestimos} itens simultâneos. O leitor já possui ${readerOpenLoans.length} itens em aberto.`,
      reader,
      policy,
      currentOpenLoansCount: readerOpenLoans.length
    };
  }

  // 2. Exemplar disponível
  const exemplar = db.exemplares.find((x) => x.id === exemplarId);
  if (!exemplar) {
    return { allowed: false, reason: 'Exemplar não encontrado.', reader, policy };
  }

  if (exemplar.status !== 'disponivel') {
    return {
      allowed: false,
      reason: `EXEMPLAR INDISPONÍVEL: Este exemplar está com status "${exemplar.status}".`,
      reader,
      exemplar,
      policy
    };
  }

  const obra = db.obras.find((o) => o.id === exemplar.obra_id);
  if (obra && !obra.ativo) {
    return {
      allowed: false,
      reason: `OBRA INATIVA: A obra "${obra.titulo}" está marcada como inativa no acervo.`,
      reader,
      exemplar,
      obra,
      policy
    };
  }

  return {
    allowed: true,
    reader,
    exemplar,
    obra,
    policy,
    currentOpenLoansCount: readerOpenLoans.length
  };
}

/**
 * Registrar empréstimo com snapshot de ano/sala e cálculo de prazo (Seção 7.1)
 */
export function registerLoan(
  db: DatabaseState,
  leitorId: string,
  exemplarId: string
): { success: boolean; message: string; db: DatabaseState } {
  const validation = validateNewLoan(db, leitorId, exemplarId);
  if (!validation.allowed) {
    return { success: false, message: validation.reason || 'Empréstimo não permitido.', db };
  }

  const { reader, exemplar, policy } = validation;
  if (!reader || !exemplar || !policy) {
    return { success: false, message: 'Dados incompletos para efetivar empréstimo.', db };
  }

  const today = formatDate();
  const dataPrevista = addDays(today, policy.prazo_dias);

  const newLoan: Emprestimo = {
    id: 'emp-' + Date.now(),
    exemplar_id: exemplar.id,
    leitor_id: reader.id,
    data_emprestimo: today,
    data_prevista: dataPrevista,
    data_devolucao: null,
    renovacoes: 0,
    // Snapshot fiel de ano e sala no momento do empréstimo (Conforme Seção 6 e 7)
    ano_leitor: reader.ano,
    sala_leitor: reader.sala
  };

  // Atualiza status do exemplar para 'emprestado'
  const updatedExemplares = db.exemplares.map((ex) =>
    ex.id === exemplar.id ? { ...ex, status: 'emprestado' as StatusExemplar } : ex
  );

  const updatedState: DatabaseState = {
    ...db,
    exemplares: updatedExemplares,
    emprestimos: [newLoan, ...db.emprestimos]
  };

  saveDatabase(updatedState);
  return {
    success: true,
    message: `Empréstimo registrado com sucesso! Devolução prevista para ${dataPrevista} (${policy.prazo_dias} dias).`,
    db: updatedState
  };
}

/**
 * Registrar devolução (Seção 7.3)
 */
export function registerReturn(
  db: DatabaseState,
  emprestimoId: string
): { success: boolean; message: string; db: DatabaseState } {
  const loan = db.emprestimos.find((e) => e.id === emprestimoId);
  if (!loan) {
    return { success: false, message: 'Empréstimo não encontrado.', db };
  }
  if (loan.data_devolucao) {
    return { success: false, message: 'Este empréstimo já foi devolvido anteriormente.', db };
  }

  const today = formatDate();
  const wasOverdue = isOverdue(loan, today);

  // Atualiza empréstimo
  const updatedEmprestimos = db.emprestimos.map((e) =>
    e.id === emprestimoId ? { ...e, data_devolucao: today } : e
  );

  // Volta status do exemplar para 'disponivel'
  const updatedExemplares = db.exemplares.map((ex) =>
    ex.id === loan.exemplar_id ? { ...ex, status: 'disponivel' as StatusExemplar } : ex
  );

  const updatedState: DatabaseState = {
    ...db,
    emprestimos: updatedEmprestimos,
    exemplares: updatedExemplares
  };

  saveDatabase(updatedState);

  const feedbackMsg = wasOverdue
    ? 'Devolução registrada com sucesso! Como o item estava em atraso, a restrição deste empréstimo foi removida.'
    : 'Devolução registrada com sucesso! Exemplar liberado para novos empréstimos.';

  return { success: true, message: feedbackMsg, db: updatedState };
}

/**
 * Renovar empréstimo (Seção 7.2)
 * Permitida quando o empréstimo não está atrasado e o número de renovações é menor que o máximo do tipo.
 */
export function renewLoan(
  db: DatabaseState,
  emprestimoId: string
): { success: boolean; message: string; db: DatabaseState } {
  const loan = db.emprestimos.find((e) => e.id === emprestimoId);
  if (!loan) {
    return { success: false, message: 'Empréstimo não encontrado.', db };
  }
  if (loan.data_devolucao) {
    return { success: false, message: 'Não é possível renovar um empréstimo já devolvido.', db };
  }

  const today = formatDate();
  if (isOverdue(loan, today)) {
    return {
      success: false,
      message: 'RENOVAÇÃO BLOQUEADA: Empréstimos com prazo vencido não podem ser renovados. O leitor deve comparecer e devolver o exemplar.',
      db
    };
  }

  const reader = db.leitores.find((l) => l.id === loan.leitor_id);
  const policy = reader
    ? db.tiposLeitor.find((t) => t.id === reader.tipo_leitor_id) || db.tiposLeitor[0]
    : db.tiposLeitor[0];

  if (loan.renovacoes >= policy.max_renovacoes) {
    return {
      success: false,
      message: `LIMITE DE RENOVAÇÕES: Este empréstimo já atingiu o limite de ${policy.max_renovacoes} renovações permitidas para a categoria ${policy.nome}.`,
      db
    };
  }

  const newDueDate = addDays(today, policy.prazo_dias);
  const updatedEmprestimos = db.emprestimos.map((e) =>
    e.id === emprestimoId
      ? { ...e, data_prevista: newDueDate, renovacoes: e.renovacoes + 1 }
      : e
  );

  const updatedState: DatabaseState = {
    ...db,
    emprestimos: updatedEmprestimos
  };

  saveDatabase(updatedState);
  return {
    success: true,
    message: `Empréstimo renovado com sucesso! Nova data prevista: ${newDueDate} (Renovação ${loan.renovacoes + 1} de ${policy.max_renovacoes}).`,
    db: updatedState
  };
}
