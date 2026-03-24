import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../api/usersApi.js';

const perfilOptions = [
  { value: 'usuario_leitura', label: 'Usuário Leitura' },
  { value: 'usuario_editor', label: 'Usuário Editor' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'administrador', label: 'Administrador' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    perfil: 'usuario_leitura',
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const canSubmit = useMemo(() => {
    return (
      form.nome.trim() &&
      form.email.trim() &&
      form.senha.length >= 6 &&
      form.confirmarSenha === form.senha &&
      !submitting
    );
  }, [form, submitting]);

  const passwordsMatch = useMemo(() => {
    if (!form.confirmarSenha) return true; // Não mostra erro se ainda não digitou
    return form.senha === form.confirmarSenha;
  }, [form.senha, form.confirmarSenha]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      await registerUser({
        nome: form.nome.trim(),
        email: form.email.trim(),
        senha: form.senha,
        perfil: form.perfil,
        status: 'ativo',
      });
      
      setSuccessMsg('Usuário cadastrado com sucesso! Você pode fazer login agora.');
      
      // Limpar formulário
      setForm({
        nome: '',
        email: '',
        senha: '',
        confirmarSenha: '',
        perfil: 'usuario_leitura',
      });
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Falha ao cadastrar usuário';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl bg-white shadow p-6">
        <div className="flex flex-col items-center text-center">
          <img src="/ebserh-logo.png" alt="EBSERH" className="h-12 w-auto" />
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Gestão de Empenho</h1>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Cadastrar Usuário</h2>
          <p className="mt-1 text-slate-600">Crie sua conta para acessar o sistema.</p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">Nome completo</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
              type="text"
              value={form.nome}
              onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Seu nome completo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
              type="email"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="seu.email@exemplo.com"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Perfil de acesso</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={form.perfil}
              onChange={(e) => setForm(prev => ({ ...prev, perfil: e.target.value }))}
            >
              {perfilOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Senha</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
              type="password"
              value={form.senha}
              onChange={(e) => setForm(prev => ({ ...prev, senha: e.target.value }))}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Confirmar senha</label>
            <input
              className={`mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                passwordsMatch 
                  ? 'border-slate-200 focus:ring-slate-300' 
                  : 'border-red-300 focus:ring-red-300'
              }`}
              type="password"
              value={form.confirmarSenha}
              onChange={(e) => setForm(prev => ({ ...prev, confirmarSenha: e.target.value }))}
              placeholder="Digite a senha novamente"
              autoComplete="new-password"
              required
            />
            {!passwordsMatch && (
              <p className="mt-1 text-sm text-red-600">As senhas não coincidem</p>
            )}
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 text-white py-2 px-4 font-medium disabled:opacity-60"
            disabled={!canSubmit}
          >
            {submitting ? 'Cadastrando...' : 'Cadastrar'}
          </button>

          <div className="pt-2 text-center text-sm">
            <span className="text-slate-600">Já tem uma conta?</span>{' '}
            <Link to="/login" className="font-medium text-slate-900 underline">
              Fazer login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}