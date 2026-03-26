import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const canSubmit = useMemo(() => email.trim() && password.length >= 6 && !submitting, [email, password, submitting]);

  const redirectTo = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const fromQuery = sp.get('redirect');
    // Mantém fallback seguro caso query venha vazia/estranha.
    if (fromQuery && typeof fromQuery === 'string' && fromQuery.startsWith('/')) return fromQuery;
    return '/dashboard';
  }, [location.search]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [loading, isAuthenticated, navigate, redirectTo]);

  if (!loading && isAuthenticated) return null;

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Falha no login';
      setErrorMsg(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl bg-white shadow p-6">
        <div className="flex flex-col items-center text-center">
          <img src="/ebserh-logo.png" alt="EBSERH" className="h-12 w-auto" />
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Gestão de Empenho</h1>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Entrar</h2>
          <p className="mt-1 text-slate-600">Acesse o sistema de gestão de empenhos.</p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Senha</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {errorMsg ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 text-white py-2 px-4 font-medium disabled:opacity-60"
            disabled={!canSubmit}
          >
            {submitting ? 'Entrando...' : 'Login'}
          </button>

          <div className="pt-2 text-center text-sm">
            <span className="text-slate-600">Precisa cadastrar um novo usuário?</span>{' '}
            <Link to="/register" className="font-medium text-slate-900 underline">
              Acessar cadastro
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

