import client from './axiosClient';

export async function listProcessos({ limit = 20, offset = 0, tipo_processo, nm_fornecedor, cnpj, edital, empenho, uf } = {}) {
  const params = { limit, offset };
  if (tipo_processo) params.tipo_processo = tipo_processo;
  if (nm_fornecedor) params.nm_fornecedor = nm_fornecedor;
  if (cnpj) params.cnpj = cnpj;
  if (edital) params.edital = edital;
  if (empenho) params.empenho = empenho;
  if (uf) params.uf = uf;

  const res = await client.get('/api/processos', { params });
  return res.data;
}

export async function createProcesso(payload) {
  const res = await client.post('/api/processos', payload);
  return res.data;
}

export async function updateProcesso(id, payload) {
  const res = await client.put(`/api/processos/${id}`, payload);
  return res.data;
}

