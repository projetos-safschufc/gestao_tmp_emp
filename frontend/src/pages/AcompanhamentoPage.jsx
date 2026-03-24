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

export default function AcompanhamentoPage() {
  const { user } = useAuth();
  
  const [empenhoBusca, setEmpenhoBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [itens, setItens] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [savedMsg, setSavedMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const selected = selectedIdx !== null ? itens[selectedIdx] : null;

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
        key: 'action',
        header: 'Ação',
        render: (r) => (
          <Button
            variant="secondary"
            onClick={() => {
              const idx = itens.findIndex((x) => x.id === r.id);
              setSelectedIdx(idx);
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
      }));

      setItens(mapped);
      setSelectedIdx(mapped.length ? 0 : null);
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

      const payloadItems = itens.map((it) => ({
        nu_processo: it.nu_processo,
        item: Number(it.item),
        cd_material: it.cd_material,
        nu_documento_siafi: it.nu_documento_siafi,
        nm_fornecedor: it.nm_fornecedor,
        cd_cgc: it.cd_cgc ?? undefined,

        prazo_entrega_dias: it.prazo_entrega_dias ?? 0,
        dt_confirmacao_recebimento: it.dt_confirmacao_recebimento || undefined,
        status_entrega: it.status_entrega,
        notificacao_codigo: it.notificacao_codigo ?? undefined,

        apuracao_irregularidade: Boolean(it.apuracao_irregularidade),
        processo_apuracao: Boolean(it.apuracao_irregularidade) ? it.processo_apuracao ?? '' : '',

        troca_marca: Boolean(it.troca_marca),
        processo_troca_marca: Boolean(it.troca_marca) ? it.processo_troca_marca ?? '' : '',

        reequilibrio_financeiro: Boolean(it.reequilibrio_financeiro),
        processo_reequilibrio_financeiro: Boolean(it.reequilibrio_financeiro)
          ? it.processo_reequilibrio_financeiro ?? ''
          : '',

        aplicacao_imr: Boolean(it.aplicacao_imr),
        valor_imr: Boolean(it.aplicacao_imr)
          ? it.valor_imr === null || it.valor_imr === '' || it.valor_imr === undefined
            ? null
            : typeof it.valor_imr === 'number'
              ? String(it.valor_imr)
              : String(it.valor_imr)
          : null,

        observacao: it.observacao ?? undefined,
        setor_responsavel: it.setor_responsavel ?? undefined,
      }));

      await upsertAcompanhamento({ items: payloadItems });
      setSavedMsg('Alterações salvas.');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao salvar acompanhamento';
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
                    <label className="block text-sm font-medium text-slate-700">Responsável pelo cadastro</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                      value={selected.setor_responsavel ?? ''}
                      onChange={(e) => updateSelected({ setor_responsavel: e.target.value })}
                      placeholder="Setor responsável"
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

