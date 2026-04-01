import client from './axiosClient';

export async function listHistorico({
  limit = 10,
  offset = 0,
  empenho,
  material,
  fornecedor,
  responsavel,
  status_entrega,
  sort_by,
  sort_dir,
} = {}) {
  const params = { limit, offset };
  if (empenho) params.empenho = empenho;
  if (material) params.material = material;
  if (fornecedor) params.fornecedor = fornecedor;
  if (responsavel) params.responsavel = responsavel;
  if (status_entrega) params.status_entrega = status_entrega;
  if (sort_by) params.sort_by = sort_by;
  if (sort_dir) params.sort_dir = sort_dir;

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

export async function getHistoricoResponsaveisOptions() {
  const res = await client.get('/api/historico/responsaveis-options');
  return res.data;
}

