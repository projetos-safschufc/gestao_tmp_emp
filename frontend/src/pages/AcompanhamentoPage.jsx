import React, { useMemo, useState } from 'react';
import Table from '../components/ui/table/Table.jsx';
import Input from '../components/ui/input/Input.jsx';
import Select from '../components/ui/select/Select.jsx';
import Button from '../components/ui/button/Button.jsx';
import { listAcompanhamentoItens, upsertAcompanhamento } from '../api/acompanhamentoApi.js';
import { useAuth } from '../auth/useAuth.js';
const statusEntregaOptions = [
  { value: 'PENDENTE', label: 'PENDENTE' },
  { value: 'ATEND. PARCIAL', label: 'ATEND. PARCIAL' },
  { value: 'ENTREGUE', label: 'ENTREGUE' },
  { value: 'CANCELADO', label: 'CANCELADO' },
];

function formatDateBRDisplay(v) {
  if (!v) return '-';
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR');
}

function formatAtrasoDias(n) {
  if (n === null || n === undefined) return '-';
  const v = Number(n);
  if (!Number.isFinite(v)) return '-';
  return `${v} dia${v === 1 ? '' : 's'}`;
}

export default function AcompanhamentoPage() {
  const { user } = useAuth();
  const [empenhoBusca, setEmpenhoBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [itens, setItens] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [savedMsg, setSavedMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const selected = selectedIdx !== null ? itens[selectedIdx] : null;
  const usuarioLogadoNome = String(user?.nome || '').trim();

  const columns = useMemo(
    () => [
      { key: 'cd_material', header: 'Material' },
      { 
        key: 'nm_fornecedor', 
        header: 'Fornecedor',
        render: (r) => r.nm_fornecedor || '-'
      },
      { 
        key: 'cd_cgc', 
        header: 'CNPJ',
        render: (r) => {
          if (!r.cd_cgc) return '-';
          // Formatar CNPJ: XX.XXX.XXX/XXXX-XX
          const cnpj = r.cd_cgc.replace(/\D/g, '');
          if (cnpj.length === 14) {
            return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
          }
          return r.cd_cgc;
        }
      },
      { key: 'nu_documento_siafi', header: 'Documento SIAFI' },
      {
        key: 'saldo_empenho',
        header: (
          <span className="block leading-tight">
            Saldo
            <br />
            empenho
          </span>
        ),
        render: (r) => (r.saldo_empenho === null || r.saldo_empenho === undefined ? '-' : r.saldo_empenho),
      },
      { 
        key: 'status_combined', 
        header: 'Status',
        render: (r) => {
          const statusItem = r.status_item || '-';
          const statusPedido = r.status_pedido || '-';
          return (
            <div className="text-xs">
              <div><strong>Item:</strong> {statusItem}</div>
              <div><strong>Pedido:</strong> {statusPedido}</div>
            </div>
          );
        }
      },
      { key: 'status_entrega', header: 'Status Entrega' },
      {
        key: 'dt_confirmacao_recebimento',
        header: (
          <span className="block leading-tight">
            Confirmação
            <br />
            e-mail recebido
          </span>
        ),
        render: (r) => formatDateBRDisplay(r.dt_confirmacao_recebimento),
      },
      {
        key: 'prazo_entrega_dias',
        header: (
          <span className="block leading-tight">
            Prazo de
            <br />
            entrega (dias)
          </span>
        ),
        render: (r) =>
          r.prazo_entrega_dias === null || r.prazo_entrega_dias === undefined ? '-' : r.prazo_entrega_dias,
      },
      {
        key: 'previsao_entrega',
        header: (
          <span className="block leading-tight">
            Previsão de
            <br />
            entrega
          </span>
        ),
        render: (r) => formatDateBRDisplay(r.previsao_entrega),
      },
      {
        key: 'atraso_dias',
        header: 'Atraso',
        render: (r) => formatAtrasoDias(r.atraso_dias),
      },
      {
        key: 'setor_responsavel',
        header: (
          <span className="block leading-tight">
            Responsável
            <br />
            controle
          </span>
        ),
        render: (r) => r.setor_responsavel || '-',
      },
      {
        key: 'observacao',
        header: 'Observação',
        render: (r) => {
          const o = r.observacao;
          if (!o) return '-';
          const s = String(o);
          if (s.length <= 56) return <span className="whitespace-normal">{s}</span>;
          return (
            <span className="block max-w-[14rem] whitespace-normal text-left" title={s}>
              {`${s.slice(0, 56)}…`}
            </span>
          );
        },
      },
      {
        key: 'action',
        header: 'Ação',
        render: (r) => (
          <Button
            variant="secondary"
            onClick={() => {
              const idx = itens.findIndex((x) => x.id === r.id);
              setSelectedIdx(idx);
              setSelectedKey(r.id);
            }}
          >
            Editar
          </Button>
        ),
      },
    ],
    [itens],
  );

  function updateSelected(patch) {
    if (selectedIdx === null) return;
    setItens((prev) => prev.map((x, idx) => (idx === selectedIdx ? { ...x, ...patch } : x)));
  }

  function toDateInputValue(v) {
    if (!v) return '';
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function onBuscar(e) {
    e?.preventDefault?.();
    setSavedMsg(null);
    setErrorMsg(null);
    setLoading(true);
    try {
      const empenho = empenhoBusca.trim();
      if (!empenho) {
        setItens([]);
        setSelectedIdx(null);
        return;
      }

      const result = await listAcompanhamentoItens({ empenho });
      const fetched = result?.itens || [];

      // Adiciona "id" para manter seleção estável no front.
      const mapped = fetched.map((it, idx) => ({
        id: `${it.nu_processo}-${it.item}-${it.cd_material}-${it.nu_documento_siafi}` || idx,
        ...it,
        dt_confirmacao_recebimento: toDateInputValue(it.dt_confirmacao_recebimento),
      }));

      setItens(mapped);
      if (!mapped.length) {
        setSelectedIdx(null);
        return;
      }

      if (selectedKey) {
        const idx = mapped.findIndex((it) => it.id === selectedKey);
        setSelectedIdx(idx >= 0 ? idx : 0);
      } else {
        setSelectedIdx(0);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao buscar itens';
      setErrorMsg(msg);
      setItens([]);
      setSelectedIdx(null);
    } finally {
      setLoading(false);
    }
  }

  async function onSalvar(e) {
    e?.preventDefault?.();
    setSavedMsg(null);
    setErrorMsg(null);

    try {
      setLoading(true);

      if (!itens.length) {
        setErrorMsg('Não há itens para salvar.');
        return;
      }

      if (!selected) {
        setErrorMsg('Selecione um item na tabela para aplicar o formulário.');
        return;
      }

      // Regra de negócio: o formulário representa o acompanhamento do empenho buscado;
      // os mesmos valores devem ser persistidos em cada linha (material) do lote atual.
      const f = selected;

      const payloadItems = itens.map((it) => ({
        nu_processo: it.nu_processo,
        item: Number(it.item),
        cd_material: it.cd_material,
        nu_documento_siafi: it.nu_documento_siafi,
        nm_fornecedor: it.nm_fornecedor,
        cd_cgc: it.cd_cgc ?? undefined,

        prazo_entrega_dias: f.prazo_entrega_dias ?? 0,
        dt_confirmacao_recebimento: f.dt_confirmacao_recebimento || undefined,
        status_entrega: f.status_entrega || 'PENDENTE',
        notificacao_codigo: f.notificacao_codigo ?? undefined,

        apuracao_irregularidade: Boolean(f.apuracao_irregularidade),
        processo_apuracao: Boolean(f.apuracao_irregularidade) ? f.processo_apuracao ?? '' : '',

        troca_marca: Boolean(f.troca_marca),
        processo_troca_marca: Boolean(f.troca_marca) ? f.processo_troca_marca ?? '' : '',

        reequilibrio_financeiro: Boolean(f.reequilibrio_financeiro),
        processo_reequilibrio_financeiro: Boolean(f.reequilibrio_financeiro)
          ? f.processo_reequilibrio_financeiro ?? ''
          : '',

        aplicacao_imr: Boolean(f.aplicacao_imr),
        valor_imr: Boolean(f.aplicacao_imr)
          ? f.valor_imr === null || f.valor_imr === '' || f.valor_imr === undefined
            ? null
            : typeof f.valor_imr === 'number'
              ? String(f.valor_imr)
              : String(f.valor_imr)
          : null,

        observacao: f.observacao ?? undefined,
        setor_responsavel: f.setor_responsavel ?? undefined,
      }));

      await upsertAcompanhamento({ items: payloadItems });
      setSavedMsg(`Alterações salvas para ${payloadItems.length} item(ns).`);
      if (selected) setSelectedKey(selected.id);
      await onBuscar();
    } catch (err) {
      const details = err?.response?.data?.details?.fieldErrors;
      const firstFieldError = details
        ? Object.values(details).find((arr) => Array.isArray(arr) && arr.length > 0)?.[0]
        : null;
      const msg = firstFieldError || err?.response?.data?.message || err?.message || 'Falha ao salvar acompanhamento';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onBuscar} className="flex flex-wrap items-end gap-4">
        <div className="min-w-[240px]">
          <Input
            label="Empenho"
            value={empenhoBusca}
            onChange={setEmpenhoBusca}
            placeholder="Informe o empenho (nu_processo ou documento SIAFI)"
          />
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar'}
          </Button>
          <Button
            variant="secondary"
            type="button"
            disabled={loading}
            onClick={() => {
              setEmpenhoBusca('');
              setItens([]);
              setSelectedIdx(null);
              setSelectedKey(null);
              setSavedMsg(null);
            }}
          >
            Limpar
          </Button>
        </div>
      </form>

      {itens.length > 0 ? (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <Table columns={columns} rows={itens} showPagination={false} page={1} pageSize={10} total={itens.length} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Edição do acompanhamento</h2>

            {errorMsg ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {errorMsg}
              </div>
            ) : null}

            {selected ? (
              <form className="mt-4 space-y-4" onSubmit={onSalvar}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <Input
                    label="Prazo de Entrega (dias)"
                    value={String(selected.prazo_entrega_dias ?? '')}
                    onChange={(v) => updateSelected({ prazo_entrega_dias: Number(v) || 0 })}
                    type="text"
                  />
                  <Input
                    label="Data de Confirmação de Recebimento"
                    value={selected.dt_confirmacao_recebimento ?? ''}
                    onChange={(v) => updateSelected({ dt_confirmacao_recebimento: v })}
                    type="date"
                  />
                   <Select
                    label="Status da entrega"
                    value={selected.status_entrega}
                    onChange={(v) => updateSelected({ status_entrega: v })}
                    options={statusEntregaOptions}
                    placeholder="Selecione..."
                  />
                  <Input
                    label="Notificação"
                    value={selected.notificacao_codigo ?? ''}
                    onChange={(v) => updateSelected({ notificacao_codigo: v })}
                    placeholder="Código/numero da notificação"
                  />
                </div>


                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(selected.apuracao_irregularidade)}
                        onChange={(e) =>
                          updateSelected({
                            apuracao_irregularidade: e.target.checked,
                            processo_apuracao: e.target.checked ? selected.processo_apuracao || 'Processo A' : '',
                          })
                        }
                      />
                      <span className="font-medium">Apuração de irregularidade</span>
                    </div>

                    {selected.apuracao_irregularidade ? (
                      <div className="mt-2">
                        <Input
                          label="Processo de apuração"
                          value={selected.processo_apuracao ?? ''}
                          onChange={(v) => updateSelected({ processo_apuracao: v })}
                          placeholder="Informe o processo"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(selected.troca_marca)}
                        onChange={(e) =>
                          updateSelected({
                            troca_marca: e.target.checked,
                            processo_troca_marca: e.target.checked ? selected.processo_troca_marca || 'Proc Troca' : '',
                          })
                        }
                      />
                      <span className="font-medium">Troca de marca</span>
                    </div>

                    {selected.troca_marca ? (
                      <div className="mt-2">
                        <Input
                          label="Processo de troca de marca"
                          value={selected.processo_troca_marca ?? ''}
                          onChange={(v) => updateSelected({ processo_troca_marca: v })}
                          placeholder="Informe o processo"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(selected.aplicacao_imr)}
                        onChange={(e) =>
                          updateSelected({
                            aplicacao_imr: e.target.checked,
                            valor_imr: e.target.checked ? selected.valor_imr || '0,00' : '',
                          })
                        }
                      />
                      <span className="font-medium">Aplicação de IMR</span>
                    </div>

                    {selected.aplicacao_imr ? (
                      <div className="mt-2">
                        <Input
                          label="Valor da IMR"
                          value={selected.valor_imr ?? ''}
                          onChange={(v) => updateSelected({ valor_imr: v })}
                          placeholder="R$ ##.###,00 (exemplo)"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Setor responsável</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                      value={selected.setor_responsavel ?? ''}
                      onChange={(e) => updateSelected({ setor_responsavel: e.target.value })}
                      placeholder="Setor responsável"
                    />
                    <label className="mt-3 block text-sm font-medium text-slate-700">Responsável pelo cadastro</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 outline-none"
                      value={usuarioLogadoNome || selected.resp_cadastro || ''}
                      readOnly
                      placeholder="Usuário logado"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Observação</label>
                    <textarea
                      className="mt-1 w-full min-h-[90px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                      value={selected.observacao ?? ''}
                      onChange={(e) => updateSelected({ observacao: e.target.value })}
                    />
                  </div>
                </div>

                {savedMsg ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {savedMsg}
                  </div>
                ) : null}

                <div className="flex gap-3">
                  <Button type="submit">Salvar histórico</Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setSavedMsg(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-slate-600 mt-2">Selecione um item na tabela acima.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">
          Busque um empenho para visualizar os itens e editar o acompanhamento.
        </div>
      )}
    </div>
  );
}

