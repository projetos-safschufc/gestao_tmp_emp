import React, { useEffect, useMemo, useState } from 'react';
import Table from '../components/ui/table/Table.jsx';
import Input from '../components/ui/input/Input.jsx';
import Select from '../components/ui/select/Select.jsx';
import Button from '../components/ui/button/Button.jsx';
import { listHistorico } from '../api/historicoApi.js';

const statusEntregaOptions = [
  { value: 'PENDENTE', label: 'PENDENTE' },
  { value: 'ATEND. PARCIAL', label: 'ATEND. PARCIAL' },
  { value: 'ENTREGUE', label: 'ENTREGUE' },
  { value: 'CANCELADO', label: 'CANCELADO' },
];

export default function HistoricoPage() {
  const [filter, setFilter] = useState({
    empenho: '',
    material: '',
    fornecedor: '',
    status_entrega: '',
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await listHistorico({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        empenho: filter.empenho || undefined,
        material: filter.material || undefined,
        fornecedor: filter.fornecedor || undefined,
        status_entrega: filter.status_entrega || undefined,
      });

      const mapped = (result.rows || []).map((r, idx) => ({
        id: `${r.nu_processo ?? 'x'}-${r.item ?? idx}-${r.cd_material ?? 'm'}`,
        ...r,
      }));
      setRows(mapped);
      setTotal(result.total || 0);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao carregar histórico';
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
  }, [page, pageSize, filter]);

  function formatDateBR(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('pt-BR');
  }

  function formatBool(value) {
    if (value === true) return 'Sim';
    if (value === false) return 'Não';
    return '-';
  }

  const columns = useMemo(
    () => [
      /*{ key: 'nu_processo', header: 'Empenho' },*/
      { key: 'nu_documento_siafi', header: 'Documento SIAFI' },
      { key: 'nm_fornecedor', header: 'Fornecedor' },
      { key: 'cd_material', header: 'Material' },
      { key: 'dt_confirmacao_recebimento', header: 'Data confirmação recebimento', render: (r) => formatDateBR(r.dt_confirmacao_recebimento) },
      { key: 'apuracao_irregularidade', header: 'Apuração irregularidade', render: (r) => formatBool(r.apuracao_irregularidade) },
      { key: 'troca_marca', header: 'Troca de marca', render: (r) => formatBool(r.troca_marca) },
      { key: 'aplicacao_imr', header: 'Aplicação de IMR', render: (r) => formatBool(r.aplicacao_imr) },
      { key: 'status_entrega', header: 'Status entrega' },
      { key: 'observacao', header: 'Observação', render: (r) => r.observacao || '-' },
      { key: 'dt_atualiz', header: 'Atualizado em' },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Histórico</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Input label="Empenho" value={filter.empenho} onChange={(v) => setFilter((p) => ({ ...p, empenho: v }))} placeholder="Ex.: 1001" />
          <Input label="Material" value={filter.material} onChange={(v) => setFilter((p) => ({ ...p, material: v }))} placeholder="Ex.: MAT001" />
          <Input label="Fornecedor" value={filter.fornecedor} onChange={(v) => setFilter((p) => ({ ...p, fornecedor: v }))} placeholder="Nome do fornecedor" />          
          <Select label="Status entrega" value={filter.status_entrega} onChange={(v) => setFilter((p) => ({ ...p, status_entrega: v }))} options={statusEntregaOptions} placeholder="Todos" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="md:col-span-2 flex items-end gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setFilter({ empenho: '', material: '', fornecedor: '', status_entrega: '' });
                setPage(1);
              }}
            >
              Limpar
            </Button>
            <Button type="button" onClick={() => setPage(1)}>
              Aplicar
            </Button>
          </div>
        </div>
      </div>

      {loading ? <div className="text-slate-600">Carregando...</div> : null}
      {errorMsg ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorMsg}</div> : null}

      <Table
        columns={columns}
        rows={rows}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />
    </div>
  );
}

