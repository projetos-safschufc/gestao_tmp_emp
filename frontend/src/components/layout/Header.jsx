import React from 'react';

export default function Header({ title, onMenuClick }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center gap-3">
        <img
          src="/ebserh-logo.png"
          alt="EBSERH"
          className="h-10 w-auto"
        />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">Painel de gestão</p>
        </div>
      </div>

      <button
        type="button"
        className="mr-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 md:hidden"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <span className="text-base">☰</span>
      </button>

      <div className="h-9 w-9 rounded-lg bg-slate-900" />
    </header>
  );
}

