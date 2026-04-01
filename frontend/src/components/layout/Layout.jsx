import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

const routeTitles = {
  '/dashboard': 'Dashboard',
  '/empenhos': 'Empenhos',
  '/acompanhamento': 'Acompanhamento',
  '/historico': 'Histórico',
  '/relatorio': 'Relatório',
  '/fornecedores': 'Fornecedores',
  '/processos': 'Processos',
  '/usuarios': 'Usuários',
};

export default function Layout({ children }) {
  const location = useLocation();
  const title = routeTitles[location.pathname] || 'Sistema';
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 bg-[#8BC547] text-slate-100 md:block">
          <Sidebar />
        </aside>

        <main className="flex-1">
          <Header title={title} onMenuClick={() => setMobileOpen(true)} />
          <div className="p-6">{children}</div>
        </main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-[#145D50]/40"
            onClick={() => setMobileOpen(false)}
            role="button"
            tabIndex={0}
          />
          <div className="absolute left-0 top-0 h-full w-64 bg-[#145D50] text-slate-100">
            <div className="p-4">
              <button
                type="button"
                className="rounded-lg bg-[#145D50] px-3 py-2 text-sm text-slate-100"
                onClick={() => setMobileOpen(false)}
              >
                Fechar
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      ) : null}
    </div>
  );
}

