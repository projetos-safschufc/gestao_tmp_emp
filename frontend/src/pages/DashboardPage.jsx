import React, { useEffect, useMemo, useState } from 'react';
import Table from '../components/ui/table/Table.jsx';
import { getDashboardMetrics } from '../api/dashboardApi.js';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [metrics, setMetrics] = useState(null);

  async function load() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getDashboardMetrics();
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
  }, []);

  const columns = useMemo(
    () => [
      { key: 'nm_fornecedor', header: 'Fornecedor' },
      {
        key: 'valorPendenteAcumulado',
        header: 'Valor acumulado pendente',
        render: (r) =>
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            Number(r.valorPendenteAcumulado || 0),
          ),
      },
      { key: 'totalItensPendentes', header: 'Itens pendentes' },
    ],
    [],
  );

  const rows = useMemo(() => {
    const top = metrics?.topFornecedores || [];
    return top.map((r, idx) => ({ id: idx, ...r }));
  }, [metrics]);

  const atrasoRows = useMemo(() => metrics?.topAtrasos || [], [metrics]);
  const maxAtraso = useMemo(
    () => atrasoRows.reduce((acc, cur) => Math.max(acc, Number(cur.tempoEnvioDias || 0)), 0),
    [atrasoRows],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-slate-600">Indicadores e visão geral em tempo real.</p>
      </div>

      {loading ? <div className="text-slate-600">Carregando...</div> : null}
      {errorMsg ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorMsg}</div> : null}

      {metrics ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-600">Total de pendentes</div>
              <div className="mt-1 text-3xl font-bold">{metrics.totalPendentes ?? 0}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-600">Tempo médio de envio (dias)</div>
              <div className="mt-1 text-3xl font-bold">
                {metrics.tempoMedioEnvioDias === null || metrics.tempoMedioEnvioDias === undefined ? '-' : metrics.tempoMedioEnvioDias}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Ranking fornecedores pendentes</h2>
            </div>
            <div className="mt-4">
              <Table columns={columns} rows={rows} showPagination={false} page={1} pageSize={10} total={rows.length} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Maiores atrasos (tempo de envio)</h2>
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
                        <div
                          className="h-3 rounded-full bg-[#145D50]"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <div className="col-span-1 text-right text-xs font-semibold text-slate-700">
                        {value}d
                      </div>
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

