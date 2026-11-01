import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ArrowLeftRight,
  FileSpreadsheet,
  BarChart3,
  Settings,
  LogOut,
  AlertTriangle
} from 'lucide-react';

export type NavPage =
  | 'dashboard'
  | 'acervo'
  | 'leitores'
  | 'emprestimos'
  | 'importacao'
  | 'relatorios'
  | 'configuracoes';

interface HeaderProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  adminName: string;
  overdueCount: number;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  adminName,
  overdueCount,
  onLogout
}) => {
  const navItems: { id: NavPage; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'acervo', label: 'Acervo', icon: BookOpen },
    { id: 'leitores', label: 'Leitores', icon: Users },
    { id: 'emprestimos', label: 'Empréstimos', icon: ArrowLeftRight },
    { id: 'importacao', label: 'Importação', icon: FileSpreadsheet },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { id: 'configuracoes', label: 'Configurações', icon: Settings }
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-6 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-base font-bold tracking-tight text-white flex items-center gap-2 hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer text-left"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
            <span>Biblioteca Linux</span>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.id === 'emprestimos' && overdueCount > 0 && (
                  <span className="ml-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {overdueCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Admin & Logout */}
        <div className="flex items-center gap-3 shrink-0">
          {overdueCount > 0 && (
            <button
              onClick={() => onNavigate('emprestimos')}
              className="hidden sm:flex items-center gap-1.5 text-xs text-rose-300 bg-rose-950/50 hover:bg-rose-950/80 border border-rose-800/60 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="Existem empréstimos com prazo vencido"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{overdueCount} atrasado{overdueCount > 1 ? 's' : ''}</span>
            </button>
          )}

          <div className="text-right hidden sm:block">
            <span className="block text-xs font-semibold text-white leading-tight">
              {adminName}
            </span>
            <span className="text-[10px] text-neutral-400">Administrador</span>
          </div>

          <button
            onClick={onLogout}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Encerrar Sessão"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile subnav */}
      <div className="lg:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-t border-neutral-900 bg-neutral-950">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.id === 'emprestimos' && overdueCount > 0 && (
                <span className="ml-1 text-[10px] font-mono px-1 py-0.2 bg-rose-500/20 text-rose-300 rounded">
                  {overdueCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
