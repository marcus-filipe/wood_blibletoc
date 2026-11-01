import {
  DatabaseState,
  Obra,
  Exemplar,
  Leitor,
  TipoLeitor,
  Emprestimo,
  LogBackup,
  LogImportacao
} from '../types/library.ts';

const BASE_URL = ''; // Relative path, works when served by FastAPI or proxied by Vite

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('biblioteca_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Autenticação
  async login(usuario: string, senha: string): Promise<{ token: string; usuario: string }> {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Falha no login' }));
      throw new Error(err.detail || 'Erro ao realizar login.');
    }
    const data = await res.json();
    localStorage.setItem('biblioteca_auth_token', data.token);
    return data;
  },

  async alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/auth/alterar-senha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Erro ao alterar senha' }));
      throw new Error(err.detail || 'Erro ao alterar senha.');
    }
  },

  // Sincronização geral de dados com o backend
  async carregarBancoCompleto(): Promise<DatabaseState> {
    const headers = getAuthHeader();
    const [obrasRes, exemplaresRes, leitoresRes, tiposRes, emprestimosRes, logsBkpRes, logsImpRes] = await Promise.all([
      fetch(`${BASE_URL}/api/obras`, { headers }),
      fetch(`${BASE_URL}/api/exemplares`, { headers }),
      fetch(`${BASE_URL}/api/leitores`, { headers }),
      fetch(`${BASE_URL}/api/tipos-leitor`, { headers }),
      fetch(`${BASE_URL}/api/emprestimos`, { headers }),
      fetch(`${BASE_URL}/api/backup/historico`, { headers }),
      fetch(`${BASE_URL}/api/importacao/historico`, { headers })
    ]);

    if (!obrasRes.ok) {
      throw new Error('Falha ao conectar com a API do servidor FastAPI.');
    }

    const obras: Obra[] = await obrasRes.json();
    const exemplares: Exemplar[] = await exemplaresRes.json();
    const leitores: Leitor[] = await leitoresRes.json();
    const tiposLeitor: TipoLeitor[] = await tiposRes.json();
    const emprestimos: Emprestimo[] = await emprestimosRes.json();
    const logsBackup: LogBackup[] = await logsBkpRes.json();
    const logsImportacao: LogImportacao[] = await logsImpRes.json();

    return {
      admin: {
        id: 'admin-1',
        usuario: 'admin',
        senha_hash: 'admin123',
        criado_em: new Date().toISOString()
      },
      obras: obras || [],
      exemplares: exemplares || [],
      leitores: leitores || [],
      tiposLeitor: (tiposLeitor && tiposLeitor.length > 0) ? tiposLeitor : [],
      emprestimos: emprestimos || [],
      logsBackup: logsBackup || [],
      logsImportacao: logsImportacao || []
    };
  },

  // Acervo
  async criarObra(obra: Partial<Obra>): Promise<Obra> {
    const res = await fetch(`${BASE_URL}/api/obras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(obra)
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao criar obra');
    return res.json();
  },

  async atualizarObra(id: string, obra: Partial<Obra>): Promise<Obra> {
    const res = await fetch(`${BASE_URL}/api/obras/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(obra)
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao atualizar obra');
    return res.json();
  },

  async inativarObra(id: string): Promise<Obra> {
    const res = await fetch(`${BASE_URL}/api/obras/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao inativar obra');
    return res.json();
  },

  async criarExemplar(exemplar: Partial<Exemplar>): Promise<Exemplar> {
    const res = await fetch(`${BASE_URL}/api/exemplares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(exemplar)
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao criar exemplar');
    return res.json();
  },

  async alterarStatusExemplar(id: string, status: string): Promise<Exemplar> {
    const res = await fetch(`${BASE_URL}/api/exemplares/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao alterar status');
    return res.json();
  },

  // Leitores
  async criarLeitor(leitor: Partial<Leitor>): Promise<Leitor> {
    const res = await fetch(`${BASE_URL}/api/leitores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(leitor)
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao cadastrar leitor');
    return res.json();
  },

  async atualizarLeitor(id: string, leitor: Partial<Leitor>): Promise<Leitor> {
    const res = await fetch(`${BASE_URL}/api/leitores/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(leitor)
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao atualizar leitor');
    return res.json();
  },

  // Empréstimos
  async registrarEmprestimo(leitorId: string, exemplarId?: string, codigoBarras?: string): Promise<Emprestimo> {
    const res = await fetch(`${BASE_URL}/api/emprestimos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({
        leitor_id: leitorId,
        exemplar_id: exemplarId,
        codigo_barras: codigoBarras
      })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao registrar empréstimo');
    return res.json();
  },

  async registrarDevolucao(emprestimoId: string): Promise<Emprestimo> {
    const res = await fetch(`${BASE_URL}/api/emprestimos/${emprestimoId}/devolucao`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao registrar devolução');
    return res.json();
  },

  async registrarRenovacao(emprestimoId: string): Promise<Emprestimo> {
    const res = await fetch(`${BASE_URL}/api/emprestimos/${emprestimoId}/renovacao`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao renovar empréstimo');
    return res.json();
  },

  // Importação
  async enviarPreviaImportacao(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/api/importacao/previa`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao processar prévia');
    return res.json();
  },

  async confirmarImportacao(arquivo: string, itens: any[]): Promise<any> {
    const res = await fetch(`${BASE_URL}/api/importacao/confirmar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ arquivo, itens })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao confirmar importação');
    return res.json();
  },

  // Backup
  async executarBackup(destino?: string): Promise<{ sucesso: boolean; mensagem: string; caminho?: string }> {
    const url = destino ? `${BASE_URL}/api/backup?destino=${encodeURIComponent(destino)}` : `${BASE_URL}/api/backup`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao executar backup');
    return res.json();
  },

  async restaurarBackup(caminhoArquivo: string): Promise<{ sucesso: boolean; mensagem: string }> {
    const res = await fetch(`${BASE_URL}/api/backup/restaurar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ caminho_arquivo: caminhoArquivo })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao restaurar backup');
    return res.json();
  },

  async sincronizarBanco(dbState: DatabaseState): Promise<void> {
    try {
      await fetch(`${BASE_URL}/api/database/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          tiposLeitor: dbState.tiposLeitor,
          obras: dbState.obras,
          exemplares: dbState.exemplares,
          leitores: dbState.leitores,
          emprestimos: dbState.emprestimos,
          logsBackup: dbState.logsBackup,
          logsImportacao: dbState.logsImportacao
        })
      });
    } catch (e) {
      console.warn('Sincronização com SQLite offline ou falhou:', e);
    }
  }
};
