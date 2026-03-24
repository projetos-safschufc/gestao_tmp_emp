import React, { useEffect, useMemo, useState } from 'react';
import Table from '../components/ui/table/Table.jsx';
import Input from '../components/ui/input/Input.jsx';
import Select from '../components/ui/select/Select.jsx';
import Button from '../components/ui/button/Button.jsx';
import { listEmpenhosPendentes, getResponsaveisOptions, getStatusPedidoOptions } from '../api/empenhosApi.js';
import { upsertAcompanhamento } from '../api/acompanhamentoApi.js';

export default function EmpenhosPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [filters, setFilters] = useState({
    fornecedor: '',
    codigo_material: '',
    empenho: '',
    responsavel: '',
    setor: '',
    status_pedido: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [saveMsg, setSaveMsg] = useState(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [editKey, setEditKey] = useState(null);
  const [editDtEnvio, setEditDtEnvio] = useState('');
  const [editSetorResp, setEditSetorResp] = useState('');
  const [saving, setSaving] = useState(false);
  const [responsaveisOptions, setResponsaveisOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [statusPedidoOptions, setStatusPedidoOptions] = useState([{ value: '', label: 'Todos' }]);

  const setorOptions = useMemo(
    () => [
      { value: '', label: 'Todos' },
      { value: 'UACE', label: 'UACE' },
      { value: 'ULOG', label: 'ULOG' },
    ],
    [],
  );

  function makeRowKey(r) {
    return `${r.nu_processo ?? ''}|${r.item ?? ''}|${r.cd_material ?? ''}|${r.nu_documento_siafi ?? 'null'}`;
  }

  function formatCurrencyBR(v) {
    if (v === null || v === undefined || v === '') return '-';
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return String(v);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  }

  function formatPercent(v) {
    if (v === null || v === undefined || v === '') return '-';
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return String(v);
    const s = new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 2,
    }).format(n);
    return `${s}%`;
  }

  function formatDateBR(isoDate) {
    if (!isoDate) return '-';
    const s = String(isoDate);
    // Mantém como YYYY-MM-DD se for para date input.
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString('pt-BR');
  }

  async function onSalvarHistorico(row) {
    setSaveMsg(null);
    setSaveErrorMsg(null);

    if (!row) return;
    if (!row.nu_documento_siafi) {
      setSaveErrorMsg('Não é possível salvar: Documento SIAFI ausente neste registro.');
      return;
    }

    const itemNum = Number(row.item);
    if (!Number.isFinite(itemNum)) {
      setSaveErrorMsg('Não é possível salvar: item inválido.');
      return;
    }

    // date input devolve YYYY-MM-DD; se vazio, enviamos undefined para manter validação do Zod.
    const dtConfirmacao = editDtEnvio && String(editDtEnvio).trim() ? String(editDtEnvio).trim() : undefined;
    const setorResp = editSetorResp && String(editSetorResp).trim() ? String(editSetorResp).trim() : undefined;

    setSaving(true);
    try {
      await upsertAcompanhamento({
        items: [
          {
            nu_processo: String(row.nu_processo),
            item: itemNum,
            cd_material: String(row.cd_material),
            nu_documento_siafi: String(row.nu_documento_siafi),
            nm_fornecedor: String(row.nm_fornecedor),
            cd_cgc: row.cd_cgc ?? undefined,
            dt_confirmacao_recebimento: dtConfirmacao,
            status_entrega: row.status_entrega ?? 'PENDENTE',
            setor_responsavel: setorResp,
          },
        ],
      });

      setSaveMsg('Alterações salvas.');
      setEditKey(null);
      setEditDtEnvio('');
      setEditSetorResp('');

      await load();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao salvar histórico';
      setSaveErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  }

  async function load() {
    setLoading(true);
    setErrorMsg(null);
    setSaveMsg(null);
    setSaveErrorMsg(null);
    try {
      const result = await listEmpenhosPendentes({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        fornecedor: filters.fornecedor || undefined,
        codigo_material: filters.codigo_material || undefined,
        empenho: filters.empenho || undefined,
        responsavel: filters.responsavel || undefined,
        setor: filters.setor || undefined,
        status_pedido: filters.status_pedido || undefined,
      });

      const mapped = (result.rows || []).map((r, idx) => ({
        id: r.item !== undefined ? `${r.nu_processo}-${r.item}-${r.cd_material}-${idx}` : `row-${idx}`,
        ...r,
      }));
      setRows(mapped);
      setTotal(result.total || 0);
    } catch (err) {
      let message = 'Falha ao carregar empenhos';
      
      if (err?.code === 'NETWORK_ERROR' || err?.message?.includes('Network Error')) {
        message = 'Erro de rede: Verifique se o servidor backend está rodando na porta correta';
      } else if (err?.response?.status === 401) {
        message = 'Não autorizado: Faça login novamente';
      } else if (err?.response?.status === 500) {
        message = 'Erro interno do servidor: Tente novamente em alguns instantes';
      } else {
        message = err?.response?.data?.message || err?.message || message;
      }
      
      setErrorMsg(message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function loadResponsaveisOptions() {
    setLoadingOptions(true);
    try {
      const result = await getResponsaveisOptions();
      const options = [
        { value: '', label: 'Todos' },
        ...(result.options || [])
      ];
      setResponsaveisOptions(options);
    } catch (err) {
      console.warn('Erro ao carregar opções de responsáveis:', err);
      setResponsaveisOptions([{ value: '', label: 'Todos' }]);
    } finally {
      setLoadingOptions(false);
    }
  }

  async function loadStatusPedidoOptions() {
    try {
      const result = await getStatusPedidoOptions({
        fornecedor: filters.fornecedor || undefined,
        codigo_material: filters.codigo_material || undefined,
        empenho: filters.empenho || undefined,
        responsavel: filters.responsavel || undefined,
        setor: filters.setor || undefined,
      });

      const options = [
        { value: '', label: 'Todos' },
        ...((result.options || []).filter((o) => o?.value && o?.label)),
      ];
      setStatusPedidoOptions(options);
    } catch (err) {
      console.warn('Erro ao carregar opções de status pedido:', err);
      setStatusPedidoOptions([{ value: '', label: 'Todos' }]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, filters]);

  useEffect(() => {
    loadResponsaveisOptions();
  }, []);

  useEffect(() => {
    loadStatusPedidoOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.fornecedor, filters.codigo_material, filters.empenho, filters.responsavel, filters.setor]);

  const columns = useMemo(
    () => [
      /*{
        key: 'nu_processo',
        header: 'Empenho',
        render: (r) => (
          <div className="whitespace-nowrap">
            <div className="font-medium text-slate-800">{r.nu_processo ?? '-'}</div>
          </div>
        ),
      },*/
      { key: 'nm_fornecedor', header: 'Fornecedor' },
      { key: 'cd_cgc', header: 'CNPJ' },
      { key: 'material', header: 'Material' },
      { key: 'cd_material', 
        header: (
          <span className="block leading-tight">
            Código <br /> 
            material
          </span>
        ),
        render: (r) => (
          <div className="whitespace-nowrap">
            <div className="text-slate-800">{r.cd_material ?? '-'}</div>
          </div>
        ),
      },
      {
        key: 'quantidades',
        header: 'Quantidades',
        render: (r) => (
          <div className="whitespace-nowrap">
            <div className="text-slate-800">Saldo: {r.saldo ?? '-'}</div>
            <div className="text-xs text-slate-500">Qtd: {r.qt_de_embalagem ?? '-'}</div>
          </div>
        ),
      },
      {
        key: 'percentual_entregue',
        header: (
          <span className="block leading-tight">
            Percentual
            <br />
            entregue
          </span>
        ),
        render: (r) => formatPercent(r.percentual_entregue),
      },
      {
        key: 'valores',
        header: 'Valores',
        render: (r) => (
          <div className="whitespace-nowrap">
            <div className="text-slate-800">Pendente: {formatCurrencyBR(r.valor_pendente)}</div>
            <div className="text-xs text-slate-500">Vlr. Unit: {formatCurrencyBR(r.valor_unidade)}</div>
          </div>
        ),
      },
      { key: 'nu_documento_siafi',
         header: (
          <span className="block leading-tight">
            Documento<br />
            SIAFI
          </span>
        ),
        render: (r) => r.nu_documento_siafi ? r.nu_documento_siafi : '-',
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => (
          <div className="whitespace-nowrap">
            <div className="text-slate-800">{r.status_pedido ?? '-'}</div>
            <div className="text-xs text-slate-500">Item: {r.status_item ?? '-'}</div>
          </div>
        ),
      },
      {
        key: 'data_envio_email',
        header: (
          <span className="block leading-tight">
            Data envio<br />
            email
          </span>
        ),
        render: (r) => formatDateBR(r.data_envio_email),
      },
      {
        key: 'setor_responsavel',
        header: (
          <span className="block leading-tight">
            Setor /<br />
            Responsável
          </span>
        ),
        render: (r) => r.setor_responsavel ?? '-',
      },
      {
        key: 'tempo_envio_dias',
        header: 'Tempo envio',
        render: (r) => (r.tempo_envio_dias === null || r.tempo_envio_dias === undefined ? '-' : `${r.tempo_envio_dias} dias`),
      },
      {
        key: 'actions',
        header: 'Ações',
        render: (r) => {
          const key = makeRowKey(r);
          const disabled = !r.nu_documento_siafi;

          if (key !== editKey) {
            return (
              <Button
                variant="secondary"
                type="button"
                disabled={disabled}
                onClick={() => {
                  setSaveMsg(null);
                  setSaveErrorMsg(null);
                  setEditKey(key);
                  setEditDtEnvio(r.data_envio_email ?? '');
                  setEditSetorResp(r.setor_responsavel ?? '');
                }}
              >
                Editar envio
              </Button>
            );
          }

          return (
            <div className="min-w-[260px]">
              <div className="flex flex-col gap-2">
                <input
                  type="date"
                  className="mt-0 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-slate-50 disabled:text-slate-500"
                  value={editDtEnvio}
                  disabled={disabled || saving}
                  onChange={(e) => setEditDtEnvio(e.target.value)}
                />
                <input
                  type="text"
                  className="mt-0 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-slate-50 disabled:text-slate-500"
                  value={editSetorResp}
                  disabled={disabled || saving}
                  placeholder="Setor/Responsável"
                  onChange={(e) => setEditSetorResp(e.target.value)}
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={disabled || saving}
                    onClick={() => onSalvarHistorico(r)}
                  >
                    {saving ? 'Salvando...' : 'Salvar histórico'}
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setEditKey(null);
                      setEditDtEnvio('');
                      setEditSetorResp('');
                      setSaveErrorMsg(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>

                {disabled ? <div className="text-xs text-red-600">SIAFI ausente</div> : null}
              </div>
            </div>
          );
        },
      },
    ],
    [editDtEnvio, editKey, editSetorResp, saving, rows],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold">Empenhos Pendentes</h1>
          <p className="mt-1 text-slate-600">Dados do backend com paginação.</p>
        </div>

        <div className="ml-auto">
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => {
              load();
            }}
          >
            Recarregar
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Filtros</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-7">
          <div>
            <Input
              label="Fornecedor"
              value={filters.fornecedor}
              onChange={(v) => {
                setFilters((p) => ({ ...p, fornecedor: v }));
                setPage(1);
              }}
              placeholder="Nome do fornecedor"
            />
          </div>
          <div>
            <Input
              label="Código material"
              value={filters.codigo_material}
              onChange={(v) => {
                setFilters((p) => ({ ...p, codigo_material: v }));
                setPage(1);
              }}
              placeholder="Ex.: 593754"
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
              placeholder="nu_processo ou SIAFI"
            />
          </div>
          <div>
            <Select
              label="Responsável"
              value={filters.responsavel}
              onChange={(v) => {
                setFilters((p) => ({ ...p, responsavel: v }));
                setPage(1);
              }}
              options={responsaveisOptions}
              placeholder={loadingOptions ? "Carregando..." : "Selecione"}
              disabled={loadingOptions}
            />
          </div>
          <div>
            <Select
              label="Setor"
              value={filters.setor}
              onChange={(v) => {
                setFilters((p) => ({ ...p, setor: v }));
                setPage(1);
              }}
              options={setorOptions}
              placeholder="Selecione"
            />
          </div>

          <div>
            <Select
              label="Status pedido"
              value={filters.status_pedido}
              onChange={(v) => {
                setFilters((p) => ({ ...p, status_pedido: v }));
                setPage(1);
              }}
              options={statusPedidoOptions}
              placeholder="Todos"
            />
          </div>

          <div>
            <Button 
              type="button"
              variant="secondary"
              className="bg-[#145D50] text-white hover:bg-[#124a44] ring-0"
              disabled={loading}
              onClick={() => {
                setFilters({
                  fornecedor: '',
                  codigo_material: '',
                  empenho: '',
                  responsavel: '',
                  setor: '',
                  status_pedido: '',
                });
                setPage(1);
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </div>        
      </div>

      {loading ? <div className="text-slate-600">Carregando...</div> : null}
      {errorMsg ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorMsg}</div>
      ) : null}

      {saveErrorMsg ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{saveErrorMsg}</div>
      ) : null}
      {saveMsg ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{saveMsg}</div>
      ) : null}

      <div className="mt-2">
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
    </div>
  );
}

