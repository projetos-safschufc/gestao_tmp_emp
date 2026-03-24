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

