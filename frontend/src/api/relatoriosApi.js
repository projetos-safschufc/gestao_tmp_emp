import client from './axiosClient';

export async function getRelatorioConsolidado({ empenho, limit = 20, offset = 0 } = {}) {
  const params = { limit, offset };
  if (empenho) params.empenho = empenho;
  const res = await client.get('/api/relatorios/consolidado', { params });
  return res.data;
}

export async function listAllRelatorioConsolidado({ empenho } = {}) {
  const limit = 100;
  let offset = 0;
  const allRows = [];
  let total = 0;

  for (;;) {
    const data = await getRelatorioConsolidado({ empenho, limit, offset });
    total = data.total ?? 0;
    const batch = data.rows ?? [];
    allRows.push(...batch);
    if (batch.length < limit || allRows.length >= total) break;
    offset += limit;
  }

  return allRows;
}

export async function getRelatorioDiagnostico({ empenho } = {}) {
  const params = {};
  if (empenho) params.empenho = empenho;
  const res = await client.get('/api/relatorios/diagnostico', { params });
  return res.data;
}

