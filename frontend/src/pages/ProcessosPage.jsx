import React, { useEffect, useMemo, useState } from 'react';
import Table from '../components/ui/table/Table.jsx';
import Input from '../components/ui/input/Input.jsx';
import Select from '../components/ui/select/Select.jsx';
import Button from '../components/ui/button/Button.jsx';
import { listProcessos, createProcesso, updateProcesso } from '../api/processosApi.js';
import { listFornecedores } from '../api/fornecedoresApi.js';
import { useAuth } from '../auth/useAuth.js';

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

const tipoProcessoOptions = [
  { value: 'Apuração de irregularidade', label: 'Apuração de irregularidade' },
  { value: 'Troca de marca', label: 'Troca de marca' },
  { value: 'Reequilíbrio de preço', label: 'Reequilíbrio de preço' },
];

const statusOptions = [
  { value: 'Em andamento', label: 'Em andamento' },
  { value: 'Reaberto', label: 'Reaberto' },
  { value: 'concluído c/ Deferimento', label: 'concluído c/ Deferimento' },
  { value: 'Concluído c/ Indeferimento', label: 'Concluído c/ Indeferimento' },
];

const sancaoOptions = [
  { value: 'advertência', label: 'advertência' },
  { value: 'arquivamento sem sanção', label: 'arquivamento sem sanção' },
  { value: 'multa', label: 'multa' },
  { value: 'sanção pendente', label: 'sanção pendente' },
];

export default function ProcessosPage() {
  const { user, token } = useAuth();
  
  const [filters, setFilters] = useState({
    tipo_processo: '',
    nm_fornecedor: '',
    cnpj: '',
    edital: '',
    empenho: '',
    uf: '',
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState(null);
  
  const [fornecedores, setFornecedores] = useState([]);
  const [loadingFornecedores, setLoadingFornecedores] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState(null);

  const [form, setForm] = useState({
    tipo_processo: 'Apuração de irregularidade',
    dt_processo: '2026-03-18',
    nm_fornecedor: '',
    cnpj: '',
    uf: 'SP',
    processo_acao: '',
    processo_origem: '',
    item_pregao: '',
    edital: '',
    empenho: '',
    dt_ufac: '2026-03-18',
    status: 'Em andamento',
    dt_conclusao: '',
    sancao_aplicada: 'advertência',
    valor_multa: '',
    observacao: '',
    anexo: null,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedProcessoId, setSelectedProcessoId] = useState(null);
  const [editingProcessoId, setEditingProcessoId] = useState(null);
  const [selectionHint, setSelectionHint] = useState(null);

  async function load() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await listProcessos({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        tipo_processo: filters.tipo_processo || undefined,
        nm_fornecedor: filters.nm_fornecedor || undefined,
        cnpj: filters.cnpj || undefined,
        edital: filters.edital || undefined,
        empenho: filters.empenho || undefined,
        uf: filters.uf || undefined,
      });

      const mapped = (result.rows || []).map((r, idx) => ({
        id: r.id_proc ?? idx,
        ...r,
      }));
      setRows(mapped);
      setTotal(result.total || 0);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao carregar processos';
      setErrorMsg(msg);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function loadFornecedores() {
    if (!token) {
      // Usar dados mockados quando não há token (demonstração)
      setFornecedores([
        { id_forn: 1, nm_fornecedor: 'FRESENIUS MEDICAL CARE LTDA', cnpj: '01440590000136', uf: 'SP' },
        { id_forn: 2, nm_fornecedor: 'PRO-SAUDE DISTRIBUIDORA DE MEDICAMENTOS EIREL', cnpj: '21297758000103', uf: 'GO' }
      ]);
      return;
    }
    
    setLoadingFornecedores(true);
    try {
      const result = await listFornecedores();
      setFornecedores(result.rows || []);
    } catch (err) {
      console.warn('Erro ao carregar fornecedores:', err.message);
      // Em caso de erro, usar dados mockados como fallback
      setFornecedores([
        { id_forn: 1, nm_fornecedor: 'FRESENIUS MEDICAL CARE LTDA', cnpj: '01440590000136', uf: 'SP' },
        { id_forn: 2, nm_fornecedor: 'PRO-SAUDE DISTRIBUIDORA DE MEDICAMENTOS EIREL', cnpj: '21297758000103', uf: 'GO' }
      ]);
    } finally {
      setLoadingFornecedores(false);
    }
  }

  useEffect(() => {
    load();
    loadFornecedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, pageSize, token]);

  // Função para lidar com seleção de fornecedor
  const handleFornecedorChange = (fornecedorId) => {
    if (!fornecedorId || fornecedorId === '') {
      setSelectedFornecedor(null);
      setForm(prev => ({
        ...prev,
        nm_fornecedor: '',
        cnpj: '',
        uf: 'SP'
      }));
      return;
    }
    
    const fornecedor = fornecedores.find(f => f.id_forn.toString() === fornecedorId.toString());
    setSelectedFornecedor(fornecedor);
    
    if (fornecedor) {
      setForm(prev => ({
        ...prev,
        nm_fornecedor: fornecedor.nm_fornecedor,
        cnpj: fornecedor.cnpj,
        uf: fornecedor.uf
      }));
    }
  };

  // Opções para o select de fornecedores
  const fornecedorOptions = useMemo(() => {
    return fornecedores.map(f => ({
      value: f.id_forn.toString(),
      label: f.nm_fornecedor
    }));
  }, [fornecedores]);

  // Função para resetar o formulário
  const resetForm = () => {
    setForm({
      tipo_processo: 'Apuração de irregularidade',
      dt_processo: '2026-03-18',
      nm_fornecedor: '',
      cnpj: '',
      uf: 'SP',
      processo_acao: '',
      processo_origem: '',
      item_pregao: '',
      edital: '',
      empenho: '',
      dt_ufac: '',
      status: 'Em andamento',
      dt_conclusao: '',
      sancao_aplicada: 'advertência',
      valor_multa: '',
      observacao: '',
      anexo: null,
    });
    setSelectedFornecedor(null);
    setEditingProcessoId(null);
    setMessage(null);
  };

  const buildPayloadFromForm = () => ({
    tipo_processo: form.tipo_processo,
    dt_processo: form.dt_processo,
    nm_fornecedor: form.nm_fornecedor,
    cnpj: form.cnpj ? form.cnpj : null,
    uf: form.uf,
    processo_acao: form.processo_acao || null,
    processo_origem: form.processo_origem || null,
    item_pregao: form.item_pregao || null,
    edital: form.edital || null,
    empenho: form.empenho || null,
    dt_ufac: form.dt_ufac || null,
    status: form.status,
    dt_conclusao: form.dt_conclusao ? form.dt_conclusao : null,
    sancao_aplicada: form.sancao_aplicada || null,
    valor_multa: form.sancao_aplicada === 'multa' ? form.valor_multa || null : null,
    observacao: form.observacao || null,
    anexo: form.anexo ?? undefined,
  });

  const openEditForm = () => {
    const selected = rows.find((r) => Number(r.id_proc) === Number(selectedProcessoId));
    if (!selected) {
      setSelectionHint('Selecione exatamente 1 processo na lista para editar.');
      return;
    }
    setSelectionHint(null);

    const fornecedorMatched =
      fornecedores.find((f) => String(f.cnpj || '').replace(/\D/g, '') === String(selected.cnpj || '').replace(/\D/g, '')) ||
      fornecedores.find((f) => f.nm_fornecedor === selected.nm_fornecedor) ||
      null;

    setSelectedFornecedor(fornecedorMatched);
    setEditingProcessoId(selected.id_proc);
    setForm({
      tipo_processo: selected.tipo_processo || 'Apuração de irregularidade',
      dt_processo: selected.dt_processo ? String(selected.dt_processo).slice(0, 10) : '',
      nm_fornecedor: selected.nm_fornecedor || '',
      cnpj: selected.cnpj || '',
      uf: selected.uf || 'SP',
      processo_acao: selected.processo_acao || '',
      processo_origem: selected.processo_origem || '',
      item_pregao: selected.item_pregao || '',
      edital: selected.edital || '',
      empenho: selected.empenho || '',
      dt_ufac: selected.dt_ufac ? String(selected.dt_ufac).slice(0, 10) : '',
      status: selected.status || 'Em andamento',
      dt_conclusao: selected.dt_conclusao ? String(selected.dt_conclusao).slice(0, 10) : '',
      sancao_aplicada: selected.sancao_aplicada || 'advertência',
      valor_multa:
        selected.valor_multa === null || selected.valor_multa === undefined ? '' : String(selected.valor_multa),
      observacao: selected.observacao || '',
      anexo: selected.anexo ?? null,
    });
    setShowForm(true);
    setMessage(null);
  };

  const columns = useMemo(
    () => [
      {
        key: 'select',
        header: '',
        render: (row) => (
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer"
            checked={Number(selectedProcessoId) === Number(row.id_proc)}
            onChange={(e) => {
              setSelectedProcessoId(e.target.checked ? row.id_proc : null);
              setMessage(null);
              setSelectionHint(null);
            }}
          />
        ),
      },
      { key: 'tipo_processo', header: 'Tipo' },
      { 
        key: 'dt_processo', 
        header: 'Data Processo',
        render: (row) => {
          if (!row.dt_processo) return '-';
          const date = new Date(row.dt_processo);
          return date.toLocaleDateString('pt-BR');
        }
      },
      { key: 'nm_fornecedor', header: 'Fornecedor' },
      { 
        key: 'cnpj', 
        header: 'CNPJ',
        render: (row) => {
          if (!row.cnpj) return '-';
          // Formatar CNPJ: XX.XXX.XXX/XXXX-XX
          const cnpj = row.cnpj.replace(/\D/g, '');
          if (cnpj.length === 14) {
            return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
          }
          return row.cnpj;
        }
      },
      { key: 'uf', header: 'UF' },
      { 
        key: 'processo_acao', 
        header: 'Processo Ação',
        render: (row) => row.processo_acao || '-'
      },
      { key: 'edital', header: 'Edital' },
      { key: 'empenho', header: 'Empenho' },
      { 
        key: 'tmp_processo', 
        header: 'Tempo Processo',
        render: (row) => {
          if (!row.tmp_processo) return '-';
          return `${row.tmp_processo} dias`;
        }
      },
      { key: 'status', header: 'Status' },
      { 
        key: 'observacao', 
        header: 'Observação',
        render: (row) => {
          if (!row.observacao) return '-';
          // Truncar observação longa para exibição na tabela
          return row.observacao.length > 50 
            ? `${row.observacao.substring(0, 50)}...` 
            : row.observacao;
        }
      },
      { 
        key: 'resp_cadastro', 
        header: 'Responsável',
        render: (row) => row.resp_cadastro || '-'
      },
    ],
    [selectedProcessoId],
  );

  const isStatusConcluded = String(form.status || '').toLowerCase().startsWith('concluído') || String(form.status || '').includes('concluído');

  const showValorMulta = form.sancao_aplicada === 'multa';

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-lg font-semibold">Listar Processos</h1>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-6">
          <div className="md:col-span-1">
            <Select
              label="Tipo processo"
              value={filters.tipo_processo}
              onChange={(v) => {
                setFilters((p) => ({ ...p, tipo_processo: v }));
                setPage(1);
              }}
              options={tipoProcessoOptions}
              placeholder="Todos"
            />
          </div>
          <div className="md:col-span-1">
            <Input
              label="Fornecedor"
              value={filters.nm_fornecedor}
              onChange={(v) => {
                setFilters((p) => ({ ...p, nm_fornecedor: v }));
                setPage(1);
              }}
              placeholder="Nome do fornecedor"
            />
          </div>
          <div>
            <Input
              label="CNPJ"
              value={filters.cnpj}
              onChange={(v) => {
                setFilters((p) => ({ ...p, cnpj: v }));
                setPage(1);
              }}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div>
            <Input
              label="Edital"
              value={filters.edital}
              onChange={(v) => {
                setFilters((p) => ({ ...p, edital: v }));
                setPage(1);
              }}
              placeholder="E-01"
            />
          </div>
          <div>
            <Input
              label="Empenho"
              value={filters.empenho}
              onChange={(v) => {
                setFilters((p) => ({ ...p, empenho: v }));
                setPage(1);
              }}
              placeholder="EMP1"
            />
          </div>
          <div className="md:col-span-1">
            <Select
              label="UF"
              value={filters.uf}
              onChange={(v) => {
                setFilters((p) => ({ ...p, uf: v }));
                setPage(1);
              }}
              options={ufOptions}
              placeholder="Todas"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
              setMessage(null);
              setSelectionHint(null);
            }}
          >
            Novo processo
          </Button>
          <Button type="button" onClick={openEditForm} disabled={!selectedProcessoId}>
            Editar processo
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              setFilters({ tipo_processo: '', nm_fornecedor: '', cnpj: '', edital: '', empenho: '', uf: '' });
              setPage(1);
            }}
          >
            Limpar filtros
          </Button>
          <span className={selectedProcessoId ? 'text-sm text-emerald-700' : 'text-sm text-amber-700'}>
            {selectedProcessoId
              ? '1 processo selecionado para edição.'
              : selectionHint || 'Selecione exatamente 1 processo para habilitar a edição.'}
          </span>
        </div>
      </div>

      {loading ? <div className="text-slate-600">Carregando...</div> : null}
      {errorMsg ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorMsg}</div>
      ) : null}

      <div className="overflow-x-auto">
        <Table
          columns={columns}
          rows={rows}
          getRowClassName={(row) =>
            Number(selectedProcessoId) === Number(row.id_proc) ? 'bg-emerald-50/70 ring-1 ring-emerald-100' : ''
          }
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      </div>

      {showForm ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">{editingProcessoId ? 'Edição de processo' : 'Cadastro de processo'}</h2>

          <form
            className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              (async () => {
                setMessage(null);
                try {
                  const payload = buildPayloadFromForm();
                  if (editingProcessoId) {
                    await updateProcesso(editingProcessoId, payload);
                    setMessage('Processo atualizado com sucesso.');
                  } else {
                    await createProcesso(payload);
                    setMessage('Processo criado com sucesso.');
                  }
                  resetForm();
                  setShowForm(false);
                  setSelectedProcessoId(null);
                  await load();
                } catch (err) {
                  const msg =
                    err?.response?.data?.message ||
                    err?.message ||
                    (editingProcessoId ? 'Falha ao atualizar processo' : 'Falha ao criar processo');
                  setMessage(msg);
                }
              })();
            }}
          >
            <Select
              label="Tipo processo"
              value={form.tipo_processo}
              onChange={(v) => setForm((p) => ({ ...p, tipo_processo: v }))}
              options={tipoProcessoOptions}
            />
            <Input label="Data processo" type="date" value={form.dt_processo} onChange={(v) => setForm((p) => ({ ...p, dt_processo: v }))} />

            <Select 
              label="Fornecedor" 
              value={selectedFornecedor?.id_forn?.toString() || ''} 
              onChange={handleFornecedorChange}
              options={fornecedorOptions}
              placeholder={loadingFornecedores ? "Carregando..." : "Selecione um fornecedor"}
              disabled={loadingFornecedores}
            />
            
            <Input 
              label="CNPJ" 
              value={form.cnpj} 
              onChange={(v) => setForm((p) => ({ ...p, cnpj: v }))} 
              placeholder="Será preenchido automaticamente"
              readOnly={!!selectedFornecedor}
              disabled={!!selectedFornecedor}
            />

            <Input 
              label="UF" 
              value={form.uf} 
              onChange={(v) => setForm((p) => ({ ...p, uf: v }))}
              placeholder="Será preenchido automaticamente"
              readOnly={!!selectedFornecedor}
              disabled={!!selectedFornecedor}
            />
            <Input label="Data UFAC" type="date" value={form.dt_ufac} onChange={(v) => setForm((p) => ({ ...p, dt_ufac: v }))} />

            <Input label="Processo ação" value={form.processo_acao} onChange={(v) => setForm((p) => ({ ...p, processo_acao: v }))} />
            <Input label="Processo origem" value={form.processo_origem} onChange={(v) => setForm((p) => ({ ...p, processo_origem: v }))} />

            <Input label="Item pregão" value={form.item_pregao} onChange={(v) => setForm((p) => ({ ...p, item_pregao: v }))} />
            <Input label="Edital" value={form.edital} onChange={(v) => setForm((p) => ({ ...p, edital: v }))} />

            <Input label="Empenho" value={form.empenho} onChange={(v) => setForm((p) => ({ ...p, empenho: v }))} />

            <Select
              label="Status"
              value={form.status}
              onChange={(v) => setForm((p) => ({ ...p, status: v }))}
              options={statusOptions}
            />

            <div className="md:col-span-1">
              <Input
                label="Data conclusão (opcional)"
                type="date"
                value={form.dt_conclusao}
                onChange={(v) => setForm((p) => ({ ...p, dt_conclusao: v }))}
                disabled={!isStatusConcluded}
              />
            </div>

            <Select
              label="Sanção aplicada"
              value={form.sancao_aplicada}
              onChange={(v) => setForm((p) => ({ ...p, sancao_aplicada: v }))}
              options={sancaoOptions}
            />

            <div className="md:col-span-1">
              {showValorMulta ? (
                <Input label="Valor multa" value={form.valor_multa} onChange={(v) => setForm((p) => ({ ...p, valor_multa: v }))} placeholder="R$ 0,00" />
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  Valor multa fica oculto quando a sanção não é <b>multa</b>.
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Observação (opcional)</label>
              <textarea
                className="mt-1 w-full min-h-[90px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                value={form.observacao}
                onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit">{editingProcessoId ? 'Atualizar' : 'Salvar'}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancelar
              </Button>
              {message ? <span className="text-sm text-emerald-700">{message}</span> : null}
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

