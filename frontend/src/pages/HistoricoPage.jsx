import React, { useEffect, useMemo, useState } from 'react';
import Table from '../components/ui/table/Table.jsx';
import Input from '../components/ui/input/Input.jsx';
import Select from '../components/ui/select/Select.jsx';
import Button from '../components/ui/button/Button.jsx';
import { listHistorico, listAllHistorico, getHistoricoResponsaveisOptions } from '../api/historicoApi.js';
import { exportHistoricoPdf, exportHistoricoExcel } from '../utils/historicoExport';

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
    responsavel: '',
    status_entrega: '',
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [responsaveisOptions, setResponsaveisOptions] = useState([{ value: '', label: 'Todos' }]);
  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('dt_atualiz');
  const [sortDir, setSortDir] = useState('desc');
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState([
    'nu_documento_siafi',
    'nm_fornecedor',
    'material',
    'dt_confirmacao_recebimento',
    'prazo_entrega_dias',
    'previsao_entrega_calc',
    'atraso_dias',
    'apuracao_irregularidade',
    'troca_marca',
    'status_entrega',
    'dt_liquidado',
    'responsavel',
    'notificacao_codigo',
    'observacao',
    'dt_atualiz',
  ]);

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
        responsavel: filter.responsavel || undefined,
        status_entrega: filter.status_entrega || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
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
  }, [page, pageSize, filter, sortBy, sortDir]);

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

  function formatPrazoDias(value) {
    if (value === null || value === undefined) return '-';
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return n === 1 ? '1 dia' : `${n} dias`;
  }

  function formatAtrasoDias(value) {
    if (value === null || value === undefined) return '-';
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '-';
    return n === 1 ? '1 dia' : `${n} dias`;
  }

  function renderSortableHeader(label, key) {
    const active = sortBy === key;
    const arrow = !active ? '' : sortDir === 'asc' ? ' ▲' : ' ▼';
    return (
      <button
        type="button"
        className={`text-left ${active ? 'text-slate-900' : 'text-slate-700'} hover:text-slate-900`}
        onClick={() => {
          if (sortBy === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
          } else {
            setSortBy(key);
            setSortDir('asc');
          }
          setPage(1);
        }}
      >
        {label}
        {arrow}
      </button>
    );
  }

  const allColumns = useMemo(
    () => [
      {
        key: 'nu_documento_siafi',
        header: renderSortableHeader(
          <span className="block leading-tight">
            Documento
            <br />
            SIAFI
          </span>,
          'nu_documento_siafi',
        ),
      },
      { key: 'nm_fornecedor', header: renderSortableHeader('Fornecedor', 'nm_fornecedor') },
      { key: 'material', header: renderSortableHeader('Material', 'material') },
      {
        key: 'dt_confirmacao_recebimento',
        header: renderSortableHeader(
          <span className="block leading-tight">
            Confirmação
            <br />
            e-mail recebido
          </span>,
          'dt_confirmacao_recebimento',
        ),
        render: (r) => formatDateBR(r.dt_confirmacao_recebimento),
      },
      {
        key: 'prazo_entrega_dias',
        header: renderSortableHeader(
          <span className="block leading-tight">
            Prazo de
            <br />
            entrega
          </span>,
          'prazo_entrega_dias',
        ),
        render: (r) => formatPrazoDias(r.prazo_entrega_dias),
      },
      {
        key: 'previsao_entrega_calc',
        header: renderSortableHeader(
          <span className="block leading-tight">
            Previsão de
            <br />
            entrega
          </span>,
          'previsao_entrega_calc',
        ),
        render: (r) => formatDateBR(r.previsao_entrega_calc),
      },
      {
        key: 'atraso_dias',
        header: renderSortableHeader('Atraso', 'atraso_dias'),
        render: (r) => formatAtrasoDias(r.atraso_dias),
      },
      {
        key: 'apuracao_irregularidade',
        header: renderSortableHeader(
          <span className="block leading-tight">
            Apuração
            <br />
            irregularidade
          </span>,
          'apuracao_irregularidade',
        ),
        render: (r) => formatBool(r.apuracao_irregularidade),
      },
      {
        key: 'troca_marca',
        header: renderSortableHeader(
          <span className="block leading-tight">
            Troca de
            <br />
            marca
          </span>,
          'troca_marca',
        ),
        render: (r) => formatBool(r.troca_marca),
      },
      {
        key: 'status_entrega',
        header: renderSortableHeader(
          <span className="block leading-tight">
            Status
            <br />
            entrega
          </span>,
          'status_entrega',
        ),
      },
      {
        key: 'dt_liquidado',
        header: renderSortableHeader('Liquidado', 'dt_liquidado'),
        render: (r) => formatDateBR(r.dt_liquidado),
      },
      {
        key: 'responsavel',
        header: renderSortableHeader(
          <span className="block leading-tight">
            Responsável
            <br />
            controle
          </span>,
          'responsavel',
        ),
        render: (r) => r.responsavel || '-',
      },
      {
        key: 'notificacao_codigo',
        header: renderSortableHeader(
          <span className="block leading-tight">
            Código
            <br />
            notificação
          </span>,
          'notificacao_codigo',
        ),
        render: (r) => r.notificacao_codigo || '-',
      },
      { key: 'observacao', header: renderSortableHeader('Observação', 'observacao'), render: (r) => r.observacao || '-' },
      {
        key: 'dt_atualiz',
        header: renderSortableHeader(
          <span className="block leading-tight">
            Atualizado
            <br />
            em
          </span>,
          'dt_atualiz',
        ),
        render: (r) => formatDateBR(r.dt_atualiz),
      },
    ],
    [sortBy, sortDir],
  );

  const columns = useMemo(
    () => allColumns.filter((c) => visibleColumnKeys.includes(c.key)),
    [allColumns, visibleColumnKeys],
  );

  const filterParams = useMemo(
    () => ({
      empenho: filter.empenho || undefined,
      material: filter.material || undefined,
      fornecedor: filter.fornecedor || undefined,
      responsavel: filter.responsavel || undefined,
      status_entrega: filter.status_entrega || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
    }),
    [filter.empenho, filter.material, filter.fornecedor, filter.responsavel, filter.status_entrega, sortBy, sortDir],
  );

  async function loadResponsaveisOptions() {
    setLoadingOptions(true);
    try {
      const result = await getHistoricoResponsaveisOptions();
      const options = [
        { value: '', label: 'Todos' },
        ...((result.options || []).filter((o) => o?.value && o?.label)),
      ];
      setResponsaveisOptions(options);
    } catch (err) {
      console.warn('Erro ao carregar opções de responsáveis do histórico:', err);
      setResponsaveisOptions([{ value: '', label: 'Todos' }]);
    } finally {
      setLoadingOptions(false);
    }
  }

  useEffect(() => {
    loadResponsaveisOptions();
  }, []);

  async function handleExportPdf() {
    setExporting(true);
    setErrorMsg(null);
    try {
      const all = await listAllHistorico(filterParams);
      if (!all.length) {
        setErrorMsg('Não há dados para exportar com os filtros atuais.');
        return;
      }
      exportHistoricoPdf(all);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao exportar PDF';
      setErrorMsg(msg);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportExcel() {
    setExporting(true);
    setErrorMsg(null);
    try {
      const all = await listAllHistorico(filterParams);
      if (!all.length) {
        setErrorMsg('Não há dados para exportar com os filtros atuais.');
        return;
      }
      await exportHistoricoExcel(all);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao exportar Excel';
      setErrorMsg(msg);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Histórico</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <Input label="Empenho" value={filter.empenho} onChange={(v) => setFilter((p) => ({ ...p, empenho: v }))} placeholder="Ex.: 1001" />
          <Input label="Material" value={filter.material} onChange={(v) => setFilter((p) => ({ ...p, material: v }))} placeholder="Nome ou código do material" />
          <Input label="Fornecedor" value={filter.fornecedor} onChange={(v) => setFilter((p) => ({ ...p, fornecedor: v }))} placeholder="Nome do fornecedor" />          
          <Select label="Responsável" value={filter.responsavel} onChange={(v) => setFilter((p) => ({ ...p, responsavel: v }))} options={responsaveisOptions} placeholder="Todos" disabled={loadingOptions} />
          <Select label="Status entrega" value={filter.status_entrega} onChange={(v) => setFilter((p) => ({ ...p, status_entrega: v }))} options={statusEntregaOptions} placeholder="Todos" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="md:col-span-2 flex items-end gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setFilter({ empenho: '', material: '', fornecedor: '', responsavel: '', status_entrega: '' });
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

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" type="button" disabled={exporting || loading} onClick={handleExportPdf}>
          {exporting ? 'Exportando…' : 'Exportar PDF'}
        </Button>
        <Button variant="secondary" type="button" disabled={exporting || loading} onClick={handleExportExcel}>
          {exporting ? 'Exportando…' : 'Exportar Excel'}
        </Button>
        <Button variant="secondary" type="button" onClick={() => setShowColumnPicker((v) => !v)}>
          {showColumnPicker ? 'Ocultar colunas' : 'Escolher colunas'}
        </Button>
      </div>

      {showColumnPicker ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 text-sm font-semibold text-slate-700">Colunas visíveis</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {allColumns.map((c) => {
              const checked = visibleColumnKeys.includes(c.key);
              return (
                <label key={c.key} className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setVisibleColumnKeys((prev) => {
                        if (checked) {
                          if (prev.length <= 1) return prev;
                          return prev.filter((k) => k !== c.key);
                        }
                        return [...prev, c.key];
                      });
                    }}
                  />
                  <span>{String(c.key).replaceAll('_', ' ')}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

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

