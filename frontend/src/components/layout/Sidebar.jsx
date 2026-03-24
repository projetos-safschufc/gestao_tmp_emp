import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/empenhos', label: 'Empenhos' },
  { to: '/acompanhamento', label: 'Acompanhamento' },
  { to: '/historico', label: 'Histórico' },
  { to: '/fornecedores', label: 'Fornecedores' },
  { to: '/processos', label: 'Processos' },
  { to: '/usuarios', label: 'Usuários' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <div className="text-lg font-bold tracking-wide">Gestão de Empenho</div>
        <div className="mt-1 text-xs text-slate-300">
          {user?.nome ? `Olá, ${user.nome}` : 'Acessando...'}
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 pb-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive
                ? 'block rounded-md px-3 py-2 text-sm font-medium text-white nav-item-active'
                : 'block rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:text-white nav-item-hover'
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 pb-5">
        <button
          type="button"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-slate-100 logout-button"
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
        >
          Sair
        </button>
      </div>
    </div>
  );
}

