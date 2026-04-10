import React, { useEffect, useMemo, useState } from 'react';
import Table from '../components/ui/table/Table.jsx';
import Input from '../components/ui/input/Input.jsx';
import Select from '../components/ui/select/Select.jsx';
import Button from '../components/ui/button/Button.jsx';
import {
  listFornecedores,
  createFornecedor,
  updateFornecedor,
  deleteFornecedor,
  listFornecedorNomeOptions,
  listFornecedorCnpjOptions,
} from '../api/fornecedoresApi.js';

const ufOptions = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
].map((u) => ({ value: u, label: u }));

export default function FornecedoresPage() {
  const [filter, setFilter] = useState({ nm_fornecedor: '', uf: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nm_fornecedor: '', cnpj: '', uf: 'SP', tel: '', email: '' });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [formMode, setFormMode] = useState('select');
  const [nomeOptions, setNomeOptions] = useState([]);
  const [cnpjOptions, setCnpjOptions] = useState([]);
  const [loadingFornecedorOptions, setLoadingFornecedorOptions] = useState(false);

  function extractApiError(err, fallbackMessage) {
    const details = err?.response?.data?.details;
    const fieldErrors = details?.fieldErrors || {};
    const firstFieldError = Object.values(fieldErrors).find((arr) => Array.isArray(arr) && arr.length > 0);
    if (firstFieldError?.[0]) return String(firstFieldError[0]);
    return err?.response?.data?.message || err?.message || fallbackMessage;
  }

  async function load() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await listFornecedores({ limit: pageSize, offset: (page - 1) * pageSize });
      const mapped = (result.rows || []).map((r, idx) => ({
        id: r.id_forn ?? idx,
        ...r,
      }));
      setRows(mapped);
      setTotal(result.total || 0);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao carregar fornecedores';
      setErrorMsg(msg);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  async function loadNomeOptions() {
    setLoadingFornecedorOptions(true);
    try {
      const data = await listFornecedorNomeOptions();
      setNomeOptions(data?.options || []);
    } catch {
      setNomeOptions([]);
    } finally {
      setLoadingFornecedorOptions(false);
    }
  }

  async function loadCnpjOptionsByNome(nome) {
    if (!nome) {
      setCnpjOptions([]);
      return;
    }
    setLoadingFornecedorOptions(true);
    try {
      const data = await listFornecedorCnpjOptions({ nm_fornecedor: nome });
      const options = data?.options || [];
      setCnpjOptions(options);
      if (options.length === 1) {
        setForm((p) => ({ ...p, cnpj: options[0].value }));
      }
    } catch {
      setCnpjOptions([]);
    } finally {
      setLoadingFornecedorOptions(false);
    }
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter.nm_fornecedor && !r.nm_fornecedor.toLowerCase().includes(filter.nm_fornecedor.toLowerCase())) return false;
      if (filter.uf && r.uf !== filter.uf) return false;
      return true;
    });
  }, [rows, filter]);

  const filterActive = Boolean(filter.nm_fornecedor || filter.uf);
  const tableRows = filterActive ? filtered : rows;
  const tableTotal = filterActive ? filtered.length : total;
  const showPagination = !filterActive;

  const columns = useMemo(
    () => [
      { key: 'nm_fornecedor', header: 'Nome' },
      { key: 'cnpj', header: 'CNPJ' },
      { key: 'uf', header: 'UF' },
      { key: 'tel', header: 'Telefone' },
      { key: 'email', header: 'Email' },
      {
        key: 'acoes',
        header: 'Ações',
        render: (r) => (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setMessage(null);
                setEditingId(r.id_forn);
                setFormMode('manual');
                setForm({
                  nm_fornecedor: r.nm_fornecedor || '',
                  cnpj: r.cnpj || '',
                  uf: r.uf || 'SP',
                  tel: r.tel || '',
                  email: r.email || '',
                });
                setShowForm(true);
              }}
            >
              Editar
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={async () => {
                const ok = window.confirm(`Deseja excluir o fornecedor "${r.nm_fornecedor}"?`);
                if (!ok) return;
                setErrorMsg(null);
                setMessage(null);
                try {
                  await deleteFornecedor(r.id_forn);
                  setMessage('Fornecedor excluído com sucesso.');
                  if (editingId === r.id_forn) {
                    setEditingId(null);
                    setShowForm(false);
                    setForm({ nm_fornecedor: '', cnpj: '', uf: 'SP', tel: '', email: '' });
                  }
                  await load();
                } catch (err) {
                  const msg = err?.response?.data?.message || err?.message || 'Falha ao excluir fornecedor';
                  setErrorMsg(msg);
                }
              }}
            >
              Excluir
            </Button>
          </div>
        ),
      },
    ],
    [editingId],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[260px]">
          <Input
            label="Nome do fornecedor"
            value={filter.nm_fornecedor}
            onChange={(v) => {
              setFilter((p) => ({ ...p, nm_fornecedor: v }));
              setPage(1);
            }}
            placeholder="Pesquisar por nome"
          />
        </div>
        <div className="min-w-[220px]">
          <Select
            label="UF"
            value={filter.uf}
            onChange={(v) => {
              setFilter((p) => ({ ...p, uf: v }));
            }}
            options={ufOptions}
            placeholder="Todas"
          />
        </div>
        <div className="ml-auto">
          <Button
            onClick={async () => {
              setMessage(null);
              setErrorMsg(null);
              setEditingId(null);
              setFormMode('select');
              setNomeOptions([]);
              setCnpjOptions([]);
              setForm({ nm_fornecedor: '', cnpj: '', uf: 'SP', tel: '', email: '' });
              setShowForm((s) => !s);
              if (!showForm) {
                await loadNomeOptions();
              }
            }}
          >
            {showForm ? 'Fechar' : 'Novo fornecedor'}
          </Button>
        </div>
      </div>

      {loading ? <div className="text-slate-600">Carregando...</div> : null}
      {errorMsg ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorMsg}</div>
      ) : null}

      {showForm ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">{editingId ? 'Editar fornecedor' : 'Cadastro de fornecedor'}</h2>
          <form
            className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-7" align="center"
            style={{ textAlign: 'left' }}
            onSubmit={async (e) => {
              e.preventDefault();
              setMessage(null);
              setErrorMsg(null);
              try {
                const nome = String(form.nm_fornecedor || '').trim();
                const cnpjDigits = String(form.cnpj || '').replace(/\D/g, '');
                if (!nome) {
                  setErrorMsg('Nome do fornecedor é obrigatório.');
                  return;
                }
                if (cnpjDigits && cnpjDigits.length !== 14) {
                  setErrorMsg('CNPJ deve conter 14 dígitos quando informado.');
                  return;
                }
                const payload = {
                  nm_fornecedor: nome,
                  cnpj: form.cnpj || undefined,
                  uf: form.uf,
                  tel: form.tel,
                  email: form.email,
                };

                if (editingId) {
                  await updateFornecedor(editingId, payload);
                  setMessage('Fornecedor atualizado com sucesso.');
                } else {
                  await createFornecedor(payload);
                  setMessage('Fornecedor salvo com sucesso.');
                }

                setEditingId(null);
                setFormMode('select');
                setNomeOptions([]);
                setCnpjOptions([]);
                setForm({ nm_fornecedor: '', cnpj: '', uf: 'SP', tel: '', email: '' });
                setShowForm(false);
                await load();
              } catch (err) {
                const msg = extractApiError(
                  err,
                  editingId ? 'Falha ao atualizar fornecedor' : 'Falha ao salvar fornecedor',
                );
                setErrorMsg(msg);
              }
            }}
          >
            <div className="md:col-span-2">
              <span className="block text-sm font-medium text-slate-700">Origem do cadastro</span>
              <div className="mt-2 flex flex-wrap gap-6">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                  <input
                    type="radio"
                    name="fornecedor-modo-cadastro"
                    className="h-4 w-4 accent-[#145D50]"
                    checked={formMode === 'manual'}
                    onChange={() => setFormMode('manual')}
                  />
                  Novo Fornecedor
                </label>
                <label
                  className={`inline-flex items-center gap-2 text-sm ${
                    editingId ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer text-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="fornecedor-modo-cadastro"
                    className="h-4 w-4 accent-[#145D50] disabled:opacity-50"
                    checked={formMode === 'select'}
                    disabled={Boolean(editingId)}
                    onChange={async () => {
                      setFormMode('select');
                      await loadNomeOptions();
                    }}
                  />
                  Selecionar da base
                </label>
              </div>
            </div>
            <div className="md:col-span-1">
              {formMode === 'select' ? (
                <Select
                  label="Nome do Fornecedor"
                  value={form.nm_fornecedor}
                  onChange={async (v) => {
                    setForm((p) => ({ ...p, nm_fornecedor: v, cnpj: '' }));
                    await loadCnpjOptionsByNome(v);
                  }}
                  options={nomeOptions}
                  placeholder="Selecione..."
                  disabled={loadingFornecedorOptions || Boolean(editingId)}
                />
              ) : (
                <Input
                  label="Nome do Fornecedor"
                  value={form.nm_fornecedor}
                  onChange={(v) => setForm((p) => ({ ...p, nm_fornecedor: v }))}
                />
              )}
            </div>
            <div className="md:col-span-1">
              {formMode === 'select' ? (
                <Select
                  label="CNPJ"
                  value={form.cnpj}
                  onChange={(v) => setForm((p) => ({ ...p, cnpj: v }))}
                  options={cnpjOptions}
                  placeholder="Selecione..."
                  disabled={loadingFornecedorOptions || !form.nm_fornecedor || Boolean(editingId)}
                />
              ) : (
                <Input
                  label="CNPJ"
                  value={form.cnpj}
                  onChange={(v) => setForm((p) => ({ ...p, cnpj: v }))}
                  placeholder="somente números"
                />
              )}
            </div>
            <div className="md:col-span-1">
              <Select label="UF" value={form.uf} onChange={(v) => setForm((p) => ({ ...p, uf: v }))} options={ufOptions} />
            </div>
            <div className="md:col-span-1">
              <Input label="Telefone" value={form.tel} onChange={(v) => setForm((p) => ({ ...p, tel: v }))} placeholder="(DDD) + número" />
            </div>
            <div className="md:col-span-1">
              <Input type="email" label="Email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} placeholder="exemplo@exemplo.com" />
            </div>
            <div className="md:col-span-3 flex items-center gap-3">
              <Button type="submit">Salvar</Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormMode('select');
                  setNomeOptions([]);
                  setCnpjOptions([]);
                  setShowForm(false);
                  setForm({ nm_fornecedor: '', cnpj: '', uf: 'SP', tel: '', email: '' });
                }}
              >
                Cancelar
              </Button>
              {message ? <span className="text-sm text-emerald-700">{message}</span> : null}
            </div>
          </form>
        </div>
      ) : null}

      <Table
        columns={columns}
        rows={tableRows}
        page={page}
        pageSize={pageSize}
        total={tableTotal}
        showPagination={showPagination}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />
    </div>
  );
}

