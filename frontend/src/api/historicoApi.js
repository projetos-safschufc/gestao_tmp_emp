import client from './axiosClient';

export async function listHistorico({ limit = 10, offset = 0, empenho, material, fornecedor, status_entrega } = {}) {
  const params = { limit, offset };
  if (empenho) params.empenho = empenho;
  if (material) params.material = material;
  if (fornecedor) params.fornecedor = fornecedor;
  if (status_entrega) params.status_entrega = status_entrega;

  const res = await client.get('/api/historico', { params });
  return res.data;
}

/** Busca todas as linhas do histórico com os mesmos filtros (pagina em lotes de até 100). */
export async function listAllHistorico(params = {}) {
  const limit = 100;
  let offset = 0;
  const allRows = [];
  let total = 0;

  for (;;) {
    const data = await listHistorico({ ...params, limit, offset });
    total = data.total ?? 0;
    const batch = data.rows ?? [];
    allRows.push(...batch);
    if (batch.length < limit || allRows.length >= total) break;
    offset += limit;
  }

  return allRows;
}

