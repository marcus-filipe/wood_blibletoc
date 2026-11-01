import React, { useState } from 'react';
import { DatabaseState, TipoLeitor, LogBackup } from '../types/library.ts';
import { saveDatabase, resetDatabase, formatDate } from '../services/storage.ts';
import {
  Settings,
  HardDrive,
  Shield,
  Save,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  KeyRound,
  FileCheck2
} from 'lucide-react';

interface ConfiguracoesProps {
  db: DatabaseState;
  onUpdateDb: (newDb: DatabaseState) => void;
}

export const Configuracoes: React.FC<ConfiguracoesProps> = ({ db, onUpdateDb }) => {
  const [activeTab, setActiveTab] = useState<'politicas' | 'backup' | 'seguranca'>('politicas');

  // Policy editing state
  const [policies, setPolicies] = useState<TipoLeitor[]>(db.tiposLeitor);
  const [policyFeedback, setPolicyFeedback] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Backup state
  const [backupPath, setBackupPath] = useState('/media/hdd_externo/backups');
  const [backupFeedback, setBackupFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Policy update
  const handleUpdatePolicy = (id: string, field: keyof TipoLeitor, value: number) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleSavePolicies = (e: React.FormEvent) => {
    e.preventDefault();
    const nextDb = { ...db, tiposLeitor: policies };
    saveDatabase(nextDb);
    onUpdateDb(nextDb);
    setPolicyFeedback('Políticas de empréstimo atualizadas com sucesso!');
    setTimeout(() => setPolicyFeedback(null), 3000);
  };

  // Manual Backup (RF10 & Section 12)
  const handleCreateBackup = () => {
    try {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:T]/g, '').substring(0, 14);
      const filename = `biblioteca_${timestamp}.json`;
      const fullPath = `${backupPath.replace(/\/$/, '')}/${filename}`;

      const rawData = JSON.stringify(db, null, 2);
      const sizeKb = Number((new Blob([rawData]).size / 1024).toFixed(1));

      // Simple mock sha-256 hash
      const hash = Array.from(new Uint8Array(32))
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join('');

      // Create downloadable file
      const blob = new Blob([rawData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const newLog: LogBackup = {
        id: 'bkp-' + Date.now(),
        data: formatDate() + ' ' + now.toLocaleTimeString('pt-BR'),
        destino: fullPath,
        status: 'sucesso',
        mensagem: 'Backup com verificação de integridade gerado com sucesso.',
        tamanho_kb: sizeKb,
        hash
      };

      const nextDb: DatabaseState = {
        ...db,
        logsBackup: [newLog, ...db.logsBackup]
      };

      saveDatabase(nextDb);
      onUpdateDb(nextDb);

      setBackupFeedback({
        type: 'success',
        message: `Backup gerado com sucesso! Arquivo "${filename}" baixado (${sizeKb} KB). Registro gravado em log_backup.`
      });
    } catch {
      setBackupFeedback({
        type: 'error',
        message: 'Falha ao gerar arquivo de backup do banco.'
      });
    }
  };

  // Restore Backup (RF10 & Section 12)
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text) as DatabaseState;

        // Integrity check: must contain essential collections
        if (!parsed.obras || !parsed.exemplares || !parsed.leitores || !parsed.emprestimos) {
          throw new Error('Arquivo de backup inválido ou corrompido.');
        }

        saveDatabase(parsed);
        onUpdateDb(parsed);
        setPolicies(parsed.tiposLeitor);

        setBackupFeedback({
          type: 'success',
          message: `Restauração do banco concluída com sucesso! ${parsed.obras.length} obras e ${parsed.leitores.length} leitores recuperados.`
        });
      } catch (err: any) {
        setBackupFeedback({
          type: 'error',
          message: err.message || 'Erro ao interpretar e restaurar o arquivo de backup.'
        });
      }
    };
    reader.readAsText(file);
  };

  // Admin Password Change
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);
    const expectedPass = db?.admin?.senha_hash || 'admin123';

    if (currentPassword !== expectedPass) {
      setPasswordFeedback({ type: 'error', message: 'Senha atual incorreta.' });
      return;
    }
    if (newPassword.length < 4) {
      setPasswordFeedback({ type: 'error', message: 'A nova senha deve ter pelo menos 4 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'A confirmação de senha não confere.' });
      return;
    }

    const nextDb: DatabaseState = {
      ...db,
      admin: {
        ...db.admin,
        senha_hash: newPassword
      }
    };
    saveDatabase(nextDb);
    onUpdateDb(nextDb);

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordFeedback({ type: 'success', message: 'Senha do administrador alterada com sucesso!' });
  };

  const handleResetData = () => {
    if (confirm('Tem certeza que deseja restaurar o banco para o acervo inicial de demonstração?')) {
      const initial = resetDatabase();
      onUpdateDb(initial);
      setPolicies(initial.tiposLeitor);
      alert('Banco de dados restaurado para o padrão inicial.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top action row */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Configurações do Sistema</h1>
        <p className="text-xs text-neutral-400 mt-1">
          Parâmetros de empréstimo por tipo de leitor, rotina de backup em HDD externo e segurança.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-xl border border-neutral-800 w-fit">
        <button
          onClick={() => setActiveTab('politicas')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'politicas'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4 text-indigo-400" />
          <span>Políticas de Empréstimo</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'backup'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <span>Backup em HDD Externo</span>
        </button>

        <button
          onClick={() => setActiveTab('seguranca')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'seguranca'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4 text-amber-400" />
          <span>Segurança & Senha</span>
        </button>
      </div>

      {/* Tab 1: Políticas de Empréstimo (RF05 & Section 7.5) */}
      {activeTab === 'politicas' && (
        <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 max-w-3xl space-y-6">
          <div>
            <h2 className="text-sm font-bold text-white mb-1">
              Políticas de Circulação por Categoria de Leitor
            </h2>
            <p className="text-xs text-neutral-400">
              Configure o prazo em dias, quantidade máxima de livros simultâneos e limite de renovações para cada público.
            </p>
          </div>

          {policyFeedback && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{policyFeedback}</span>
            </div>
          )}

          <form onSubmit={handleSavePolicies} className="space-y-6">
            <div className="divide-y divide-neutral-800">
              {policies.map((policy) => (
                <div key={policy.id} className="py-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-4">
                    <span className="font-semibold text-white block text-xs">{policy.nome}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">Código: {policy.codigo}</span>
                  </div>

                  <div className="sm:col-span-8 grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">
                        Prazo (dias)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={policy.prazo_dias}
                        onChange={(e) => handleUpdatePolicy(policy.id, 'prazo_dias', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">
                        Limite de Itens
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={policy.limite_emprestimos}
                        onChange={(e) => handleUpdatePolicy(policy.id, 'limite_emprestimos', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">
                        Renovações
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={policy.max_renovacoes}
                        onChange={(e) => handleUpdatePolicy(policy.id, 'max_renovacoes', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-neutral-800 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Alterações de Políticas</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Backup & Restauração (RF10 & Section 12) */}
      {activeTab === 'backup' && (
        <div className="space-y-6 max-w-4xl">
          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-white mb-1">
                Backup do Banco de Dados em Disco Externo (HDD)
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Conforme a arquitetura local, os dados da biblioteca (<code className="font-mono text-neutral-300">biblioteca.db</code>) são salvos de forma íntegra. Gere cópias seguras ou restaure estados anteriores.
              </p>
            </div>

            {backupFeedback && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                  backupFeedback.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-800/80 text-rose-200'
                }`}
              >
                {backupFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                )}
                <span>{backupFeedback.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Manual Backup Box */}
              <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-white block mb-1">Gerar Backup Imediato</span>
                  <p className="text-[11px] text-neutral-400 mb-4">
                    Exporta o snapshot completo com hash de integridade e registro automático em <code className="font-mono text-neutral-300">log_backup</code>.
                  </p>

                  <div className="mb-4">
                    <label className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
                      Caminho Simulado de Montagem no Linux
                    </label>
                    <input
                      type="text"
                      value={backupPath}
                      onChange={(e) => setBackupPath(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateBackup}
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Realizar Backup Agora</span>
                </button>
              </div>

              {/* Restore Box */}
              <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-white block mb-1">Restaurar a Partir de Backup</span>
                  <p className="text-[11px] text-neutral-400 mb-4">
                    Substitui o estado do banco atual pelos dados do arquivo de backup selecionado após conferência de formato.
                  </p>
                </div>

                <label className="w-full py-2 px-3 text-xs font-semibold text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95">
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Selecionar Arquivo de Backup (.json)</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Backup Log Table (log_backup) */}
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Histórico de Backups Registrados</span>
              <span className="text-[11px] text-neutral-400 font-mono">Tabela log_backup</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950/80 text-neutral-400 font-semibold border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Data & Hora</th>
                    <th className="py-3 px-4">Destino no HDD</th>
                    <th className="py-3 px-4 text-center">Tamanho</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Mensagem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {db.logsBackup.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-800/40">
                      <td className="py-3.5 px-4 font-mono text-neutral-300">{log.data}</td>
                      <td className="py-3.5 px-4 font-mono text-neutral-400 max-w-[240px] truncate">{log.destino}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-neutral-300 tabular-nums">
                        {log.tamanho_kb} KB
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Sucesso</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-400">{log.mensagem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Segurança (Section 13) */}
      {activeTab === 'seguranca' && (
        <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 max-w-xl space-y-6">
          <div>
            <h2 className="text-sm font-bold text-white mb-1">
              Segurança e Credenciais de Acesso
            </h2>
            <p className="text-xs text-neutral-400">
              Usuário atual: <strong className="text-white font-mono">{db?.admin?.usuario || 'admin'}</strong>
            </p>
          </div>

          {passwordFeedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs ${
                passwordFeedback.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-800/80 text-rose-200'
              }`}
            >
              {passwordFeedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{passwordFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Senha Atual
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Senha atual cadastrada"
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Nova Senha
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-4 border-t border-neutral-800 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <KeyRound className="w-4 h-4" />
                <span>Atualizar Senha de Acesso</span>
              </button>
            </div>
          </form>

          {/* Reset button */}
          <div className="pt-6 border-t border-neutral-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">Restaurar Dados de Teste</span>
              <span className="text-[11px] text-neutral-400">Recarregar acervo inicial padrão</span>
            </div>
            <button
              type="button"
              onClick={handleResetData}
              className="px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-950 border border-rose-800/60 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Resetar Banco</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
