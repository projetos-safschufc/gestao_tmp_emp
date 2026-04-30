import React, { useEffect, useMemo, useState } from 'react';
import Table from '../components/ui/table/Table.jsx';
import Input from '../components/ui/input/Input.jsx';
import Select from '../components/ui/select/Select.jsx';
import Button from '../components/ui/button/Button.jsx';
import { listUsers, createUser, resetPassword, updateUserAccess } from '../api/usersApi.js';
import { useAuth } from '../auth/useAuth.js';

const perfilOptions = [
  { value: 'usuario_leitura', label: 'usuario_leitura' },
  { value: 'usuario_editor', label: 'usuario_editor' },
  { value: 'gestor', label: 'gestor' },
  { value: 'administrador', label: 'administrador' },
];

export default function UsuariosPage() {
  const { user } = useAuth();
  const isAdmin = String(user?.perfil || '').toLowerCase() === 'administrador';
  const [filterEmail, setFilterEmail] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    perfil: 'usuario_leitura',
    status: 'ativo',
  });

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [rows, setRows] = useState([]);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [resetSenha, setResetSenha] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState(null);
  const [resetMsg, setResetMsg] = useState(null);
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessUser, setAccessUser] = useState(null);
  const [accessForm, setAccessForm] = useState({ perfil: 'usuario_leitura', status: 'ativo' });
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState(null);
  const [accessMsg, setAccessMsg] = useState(null);

  async function load() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await listUsers({ limit: pageSize, offset: (page - 1) * pageSize });
      const mapped = (result.rows || []).map((r, idx) => ({
        id: r.id ?? idx,
        ...r,
      }));
      setRows(mapped);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao carregar usuários';
      setErrorMsg(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const filtered = useMemo(() => {
    if (!filterEmail.trim()) return rows;
    return rows.filter((r) => r.email.toLowerCase().includes(filterEmail.toLowerCase()));
  }, [rows, filterEmail]);

  const total = filtered.length;

  const columns = useMemo(
    () => [
      { key: 'nome', header: 'Nome' },
      { key: 'email', header: 'Email' },
      { key: 'perfil', header: 'Perfil' },
      { key: 'status', header: 'Status' },
      {
        key: 'actions',
        header: 'Ações',
        render: (r) => (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setResetError(null);
                setResetMsg(null);
                setResetUser(r);
                setResetSenha('');
                setResetOpen(true);
              }}
            >
              Resetar senha
            </Button>
            {isAdmin && Number(r.id) !== Number(user?.id) ? (
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setAccessError(null);
                  setAccessMsg(null);
                  setAccessUser(r);
                  setAccessForm({
                    perfil: r.perfil || 'usuario_leitura',
                    status: r.status || 'ativo',
                  });
                  setAccessOpen(true);
                }}
              >
                Alterar acesso
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [isAdmin, user?.id],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[320px]">
          <Input
            label="Buscar por email"
            value={filterEmail}
            onChange={(v) => {
              setFilterEmail(v);
              setPage(1);
            }}
            placeholder="email@dominio.com"
          />
        </div>
        <div className="ml-auto">
          <Button
            onClick={() => {
              setMessage(null);
              setForm({ nome: '', email: '', senha: '', perfil: 'usuario_leitura', status: 'ativo' });
              setShowForm(true);
            }}
          >
            Novo usuário
          </Button>
        </div>
      </div>

      {loading ? <div className="text-slate-600">Carregando...</div> : null}
      {errorMsg ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorMsg}</div>
      ) : null}

      <Table
        columns={columns}
        rows={filtered}
        page={page}
        pageSize={pageSize}
        total={total}
        showPagination={false}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />

      {showForm ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Cadastro de usuário</h2>

          <form
            className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              (async () => {
                setMessage(null);
                try {
                  await createUser({
                    nome: form.nome,
                    email: form.email,
                    senha: form.senha,
                    perfil: form.perfil,
                    status: form.status,
                  });
                  setMessage('Usuário criado com sucesso.');
                  setShowForm(false);
                  await load();
                } catch (err) {
                  const msg = err?.response?.data?.message || err?.message || 'Falha ao criar usuário';
                  setMessage(msg);
                }
              })();
            }}
          >
            <Input label="Nome" value={form.nome} onChange={(v) => setForm((p) => ({ ...p, nome: v }))} />
            <Input label="Email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} />

            <Input label="Senha" type="password" value={form.senha} onChange={(v) => setForm((p) => ({ ...p, senha: v }))} placeholder="mínimo 6 caracteres" />
            <Select label="Perfil" value={form.perfil} onChange={(v) => setForm((p) => ({ ...p, perfil: v }))} options={perfilOptions} />

            <Select
              label="Status"
              value={form.status}
              onChange={(v) => setForm((p) => ({ ...p, status: v }))}
              options={[
                { value: 'ativo', label: 'ativo' },
                { value: 'inativo', label: 'inativo' },
              ]}
            />

            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit">Salvar</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              {message ? <span className="text-sm text-emerald-700">{message}</span> : null}
            </div>
          </form>
        </div>
      ) : null}

      {resetOpen ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Resetar senha</h2>
          <p className="mt-1 text-sm text-slate-600">
            Usuário: <b>{resetUser?.nome}</b>
          </p>

          <form
            className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              (async () => {
                setResetLoading(true);
                setResetError(null);
                setResetMsg(null);
                try {
                  await resetPassword(resetUser.id, resetSenha);
                  setResetMsg('Senha atualizada com sucesso.');
                  setResetOpen(false);
                  setResetUser(null);
                  setResetSenha('');
                  await load();
                } catch (err) {
                  const msg = err?.response?.data?.message || err?.message || 'Falha ao resetar senha';
                  setResetError(msg);
                } finally {
                  setResetLoading(false);
                }
              })();
            }}
          >
            <div className="md:col-span-2">
              <Input
                label="Nova senha"
                type="password"
                value={resetSenha}
                onChange={setResetSenha}
                placeholder="mínimo 6 caracteres"
              />
            </div>

            {resetError ? (
              <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {resetError}
              </div>
            ) : null}

            {resetMsg ? (
              <div className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {resetMsg}
              </div>
            ) : null}

            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={resetLoading || resetSenha.length < 6}>
                {resetLoading ? 'Resetando...' : 'Confirmar reset'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setResetOpen(false);
                  setResetUser(null);
                  setResetSenha('');
                  setResetError(null);
                  setResetMsg(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {accessOpen ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Alterar perfil e status</h2>
          <p className="mt-1 text-sm text-slate-600">
            Usuário: <b>{accessUser?.nome}</b> ({accessUser?.email})
          </p>

          <form
            className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              (async () => {
                setAccessLoading(true);
                setAccessError(null);
                setAccessMsg(null);
                try {
                  await updateUserAccess(accessUser.id, {
                    perfil: accessForm.perfil,
                    status: accessForm.status,
                  });
                  setAccessMsg('Acesso atualizado com sucesso.');
                  setAccessOpen(false);
                  setAccessUser(null);
                  await load();
                } catch (err) {
                  const msg = err?.response?.data?.message || err?.message || 'Falha ao atualizar acesso';
                  setAccessError(msg);
                } finally {
                  setAccessLoading(false);
                }
              })();
            }}
          >
            <Select
              label="Perfil"
              value={accessForm.perfil}
              onChange={(v) => setAccessForm((p) => ({ ...p, perfil: v }))}
              options={perfilOptions}
            />

            <Select
              label="Status"
              value={accessForm.status}
              onChange={(v) => setAccessForm((p) => ({ ...p, status: v }))}
              options={[
                { value: 'ativo', label: 'ativo' },
                { value: 'inativo', label: 'inativo' },
              ]}
            />

            {accessError ? (
              <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {accessError}
              </div>
            ) : null}

            {accessMsg ? (
              <div className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {accessMsg}
              </div>
            ) : null}

            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={accessLoading}>
                {accessLoading ? 'Salvando...' : 'Salvar alterações'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setAccessOpen(false);
                  setAccessUser(null);
                  setAccessError(null);
                  setAccessMsg(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

