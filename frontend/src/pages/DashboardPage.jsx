import React, { useEffect, useMemo, useState } from 'react';
import Table from '../components/ui/table/Table.jsx';
import { getDashboardMetrics } from '../api/dashboardApi.js';

function formatBRL(n) {
  const v = Number(n || 0);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function formatPct(n) {
  if (n === null || n === undefined) return '—';
  return `${Number(n).toFixed(1)}%`;
}

function severityStyles(sev) {
  if (sev === 'high') return 'border-red-200 bg-red-50 text-red-900';
  if (sev === 'medium') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-slate-200 bg-slate-50 text-slate-800';
}

function BarRow({ label, value, max }) {
  const m = Math.max(1, max || 1);
  const w = Math.max(4, Math.round((Number(value || 0) / m) * 100));
  return (
    <div className="grid grid-cols-12 items-center gap-2">
      <div className="col-span-4 truncate text-xs text-slate-600" title={label}>
        {label}
      </div>
      <div className="col-span-6 h-2.5 rounded-full bg-slate-100">
        <div className="h-2.5 rounded-full bg-[#145D50]" style={{ width: `${w}%` }} />
      </div>
      <div className="col-span-2 text-right text-xs font-semibold text-slate-700">{value}</div>
    </div>
  );
}

function TrendChart({ points }) {
  const data = points || [];
  const max = data.reduce((acc, p) => Math.max(acc, Number(p.novosPendentes || 0)), 0) || 1;
  const chartH = 120;
  return (
    <div className="flex h-[140px] items-end gap-1">
      {data.map((p, idx) => {
        const v = Number(p.novosPendentes || 0);
        const barPx = Math.max(3, Math.round((v / max) * chartH));
        const d = p.periodStart ? new Date(p.periodStart) : null;
        const lab = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : idx;
        return (
          <div key={`${p.periodStart}-${idx}`} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <div
              className="w-full rounded-t bg-[#145D50]/85"
              style={{ height: `${barPx}px` }}
              title={`${lab}: ${p.novosPendentes ?? 0}`}
            />
            <div className="max-w-[52px] truncate text-center text-[9px] leading-tight text-slate-500">{lab}</div>
          </div>
        );
      })}
    </div>
  );
}

function HeatmapScoreCell({ score }) {
  const s = Math.max(0, Math.min(100, Number(score || 0)));
  let cls = 'bg-emerald-100 text-emerald-900';
  if (s >= 66) cls = 'bg-red-100 text-red-900';
  else if (s >= 33) cls = 'bg-amber-100 text-amber-900';
  return <span className={`inline-flex min-w-[2.5rem] justify-center rounded px-2 py-1 text-xs font-semibold ${cls}`}>{s}</span>;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [trendDays] = useState(90);

  async function load() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getDashboardMetrics({ trendDays });
      setMetrics(data);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao carregar dashboard';
      setErrorMsg(msg);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendDays]);

  const rankingColumns = useMemo(
    () => [
      { key: 'nm_fornecedor', header: 'Fornecedor' },
      {
        key: 'valorPendenteAcumulado',
        header: 'Valor acumulado pendente',
        render: (r) => formatBRL(r.valorPendenteAcumulado),
      },
      { key: 'totalItensPendentes', header: 'Itens pendentes' },
    ],
    [],
  );

  const rankingRows = useMemo(() => {
    const top = metrics?.topFornecedores || [];
    return top.map((r, idx) => ({ id: idx, ...r }));
  }, [metrics]);

  const riskColumns = useMemo(
    () => [
      { key: 'nmFornecedor', header: 'Fornecedor' },
      { key: 'nivelRisco', header: 'Risco' },
      { key: 'scoreRisco', header: 'Score' },
      { key: 'pctAtraso', header: '% atraso' },
      { key: 'mediaAtrasoDias', header: 'Média atraso (d)' },
      { key: 'processosAbertos', header: 'Proc. abertos' },
      {
        key: 'valorPendenteTotal',
        header: 'Valor pendente',
        render: (r) => formatBRL(r.valorPendenteTotal),
      },
    ],
    [],
  );

  const riskRows = useMemo(() => {
    const rows = metrics?.supplierRiskRanking || [];
    return rows.map((r, idx) => ({ id: idx, ...r }));
  }, [metrics]);

  const paretoColumns = useMemo(
    () => [
      { key: 'nmFornecedor', header: 'Fornecedor' },
      { key: 'valorPendente', header: 'Valor', render: (r) => formatBRL(r.valorPendente) },
      { key: 'pctAcumulado', header: '% acum.', render: (r) => `${Number(r.pctAcumulado).toFixed(1)}%` },
    ],
    [],
  );

  const paretoRows = useMemo(() => {
    const rows = metrics?.paretoSuppliers || [];
    return rows.map((r, idx) => ({ id: idx, ...r }));
  }, [metrics]);

  const atrasoRows = useMemo(() => metrics?.topAtrasos || [], [metrics]);
  const maxAtraso = useMemo(
    () => atrasoRows.reduce((acc, cur) => Math.max(acc, Number(cur.tempoEnvioDias || 0)), 0),
    [atrasoRows],
  );

  const aging = metrics?.agingBuckets || [];
  const agingMax = aging.reduce((acc, b) => Math.max(acc, Number(b.count || 0)), 0) || 1;

  const pipeline = metrics?.pipelineStages || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-slate-600">Indicadores estratégicos, risco, SLA e priorização.</p>
      </div>

      {loading ? <div className="text-slate-600">Carregando...</div> : null}
      {errorMsg ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorMsg}</div> : null}

      {metrics ? (
        <>
          {Array.isArray(metrics.alerts) && metrics.alerts.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-800">Alertas e recomendações</h2>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {metrics.alerts.map((a) => (
                  <div key={a.code} className={`rounded-xl border p-4 text-sm ${severityStyles(a.severity)}`}>
                    <div className="font-semibold">{a.title || a.code}</div>
                    <div className="mt-1">{a.message}</div>
                    {a.hint ? <div className="mt-2 text-xs opacity-90">{a.hint}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-600">Total pendente</div>
              <div className="mt-1 text-3xl font-bold">{metrics.executiveCards?.totalPendentes ?? metrics.totalPendentes ?? 0}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-600">Valor em risco (em atraso)</div>
              <div className="mt-1 text-2xl font-bold">{formatBRL(metrics.executiveCards?.valorEmRisco)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-600">SLA (itens com previsão)</div>
              <div className="mt-1 text-2xl font-bold">{formatPct(metrics.sla?.pctNoPrazo)} no prazo</div>
              <div className="text-xs text-slate-500">{formatPct(metrics.sla?.pctAtrasado)} em atraso</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-600">Atrasos críticos (&gt;60d)</div>
              <div className="mt-1 text-3xl font-bold">{metrics.executiveCards?.atrasosCriticos ?? 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
              <div className="text-sm font-semibold text-slate-800">Tempo médio de envio (dias)</div>
              <div className="mt-2 text-3xl font-bold">
                {metrics.tempoMedioEnvioDias === null || metrics.tempoMedioEnvioDias === undefined
                  ? '—'
                  : metrics.tempoMedioEnvioDias}
              </div>
              <p className="mt-2 text-xs text-slate-500">Média entre itens com confirmação de recebimento.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Tendência — novos cadastros (semanal)</h2>
                <span className="text-xs text-slate-500">Janela: {metrics.trendSeries?.trendDays ?? trendDays} dias</span>
              </div>
              <div className="mt-4">
                {metrics.trendSeries?.points?.length ? (
                  <TrendChart points={metrics.trendSeries.points} />
                ) : (
                  <div className="text-sm text-slate-500">Sem pontos na série para o período.</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-semibold">Aging de atrasos (após previsão)</h2>
              <p className="text-xs text-slate-500">Somente itens com atraso &gt; 0.</p>
              <div className="mt-4 space-y-2">
                {aging.map((b) => (
                  <BarRow key={b.faixa} label={`${b.faixa} dias`} value={b.count} max={agingMax} />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-semibold">Funil (pendências)</h2>
              <div className="mt-4 space-y-3 text-sm">
                <BarRow label="Total pendentes" value={pipeline.totalPendentes} max={pipeline.totalPendentes || 1} />
                <BarRow label="Com confirmação de e-mail" value={pipeline.comConfirmacaoEmail} max={pipeline.totalPendentes || 1} />
                <BarRow label="Sem atraso calculado" value={pipeline.dentroPrazoOuSemAtraso} max={pipeline.totalPendentes || 1} />
                <BarRow label="Em atraso" value={pipeline.emAtraso} max={pipeline.totalPendentes || 1} />
                <BarRow label="Com notificação" value={pipeline.comNotificacao} max={pipeline.totalPendentes || 1} />
                <BarRow label="Com processo de apuração" value={pipeline.comProcessoApuracao} max={pipeline.totalPendentes || 1} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-semibold">Pareto — valor pendente</h2>
              <div className="mt-4 overflow-x-auto">
                <Table columns={paretoColumns} rows={paretoRows} showPagination={false} page={1} pageSize={20} total={paretoRows.length} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-semibold">Heatmap (fornecedores — scores 0–100)</h2>
              <p className="text-xs text-slate-500">SLA = aderência ao prazo; Atraso = incidência; Risco = score composto.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-700">
                      <th className="py-2 pr-3">Fornecedor</th>
                      <th className="py-2 pr-3">SLA</th>
                      <th className="py-2 pr-3">Atraso</th>
                      <th className="py-2 pr-3">Risco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(metrics.supplierHeatmap || []).map((h) => (
                      <tr key={h.nmFornecedor} className="border-b border-slate-100">
                        <td className="py-2 pr-3 text-slate-800">{h.nmFornecedor}</td>
                        <td className="py-2 pr-3">
                          <HeatmapScoreCell score={h.slaScore} />
                        </td>
                        <td className="py-2 pr-3">
                          <HeatmapScoreCell score={h.atrasoScore} />
                        </td>
                        <td className="py-2 pr-3">
                          <HeatmapScoreCell score={h.riscoScore} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Ranking de risco por fornecedor</h2>
            <div className="mt-4 overflow-x-auto">
              <Table columns={riskColumns} rows={riskRows} showPagination={false} page={1} pageSize={25} total={riskRows.length} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Progresso por empenho (top valor pendente)</h2>
            <div className="mt-4 space-y-3">
              {(metrics.topEmpenhosProgress || []).length === 0 ? (
                <div className="text-sm text-slate-500">Sem dados.</div>
              ) : (
                (metrics.topEmpenhosProgress || []).map((row, idx) => {
                  const pct = row.pctEntregue === null || row.pctEntregue === undefined ? 0 : Number(row.pctEntregue);
                  const color =
                    row.semaforo === 'vermelho' ? 'bg-red-500' : row.semaforo === 'amarelo' ? 'bg-amber-400' : 'bg-emerald-600';
                  return (
                    <div key={`${row.nuDocumentoSiafi}-${idx}`} className="grid grid-cols-12 items-center gap-2 text-sm">
                      <div className="col-span-5 truncate text-slate-800" title={row.nuDocumentoSiafi}>
                        <span className="font-medium">{row.nuDocumentoSiafi}</span>
                        <span className="block truncate text-xs text-slate-500">{row.nmFornecedor}</span>
                      </div>
                      <div className="col-span-4 h-3 rounded-full bg-slate-100">
                        <div className={`h-3 rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                      </div>
                      <div className="col-span-2 text-right text-xs text-slate-600">{pct}%</div>
                      <div className="col-span-1 text-right text-xs text-slate-500">{formatBRL(row.valorPendente)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Ranking fornecedores (legado)</h2>
            </div>
            <div className="mt-4">
              <Table columns={rankingColumns} rows={rankingRows} showPagination={false} page={1} pageSize={10} total={rankingRows.length} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Maiores atrasos (tempo de envio — legado)</h2>
            </div>
            <div className="mt-4 space-y-3">
              {atrasoRows.length === 0 ? (
                <div className="text-sm text-slate-500">Sem dados de atraso para exibir.</div>
              ) : (
                atrasoRows.map((row, idx) => {
                  const value = Number(row.tempoEnvioDias || 0);
                  const width = maxAtraso > 0 ? Math.max(6, Math.round((value / maxAtraso) * 100)) : 0;
                  return (
                    <div key={`${row.label}-${idx}`} className="grid grid-cols-12 items-center gap-3">
                      <div className="col-span-7 truncate text-sm text-slate-700" title={row.label}>
                        {row.label}
                      </div>
                      <div className="col-span-4 h-3 rounded-full bg-slate-100">
                        <div className="h-3 rounded-full bg-[#145D50]" style={{ width: `${width}%` }} />
                      </div>
                      <div className="col-span-1 text-right text-xs font-semibold text-slate-700">{value}d</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
