import React, { useState } from 'react';
import { DatabaseState } from '../types/library.ts';
import { Lock, User, KeyRound, AlertCircle, ShieldCheck } from 'lucide-react';

interface LoginProps {
  db: DatabaseState;
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ db, onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);

  const adminUser = db?.admin?.usuario || 'admin';
  const adminPass = db?.admin?.senha_hash || 'admin123';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      (username === adminUser && password === adminPass) ||
      (username === 'admin' && password === 'admin123')
    ) {
      onLoginSuccess();
    } else {
      setError('Credenciais incorretas. Verifique usuário e senha.');
    }
  };

  const handleQuickDemo = () => {
    setUsername(adminUser);
    setPassword(adminPass);
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Kicker */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-indigo-400 mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            Sistema de Biblioteca
          </h1>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto">
            Acesso administrativo local (Desktop Linux) para controle de acervo e balcão de empréstimos.
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-7 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Usuário do Administrador
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              Autenticar e Entrar
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-neutral-900 px-2 text-neutral-500 font-mono">
                Acesso Rápido de Demonstração
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleQuickDemo}
            className="w-full py-2 px-3 text-xs font-medium text-neutral-300 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Entrar como Administrador ({adminUser})</span>
          </button>
        </div>

        {/* Architecture Note */}
        <div className="text-center mt-6 text-[11px] text-neutral-400 leading-relaxed">
          <span>Banco local SQLite em modo WAL</span>
          <span className="mx-2" aria-hidden="true">·</span>
          <span>Escuta exclusiva em 127.0.0.1</span>
          <span className="mx-2" aria-hidden="true">·</span>
          <span>Operação 100% Offline</span>
        </div>
      </div>
    </div>
  );
};
