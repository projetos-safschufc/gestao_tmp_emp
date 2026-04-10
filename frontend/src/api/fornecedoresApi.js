import client from './axiosClient';

export async function listFornecedores({ limit = 20, offset = 0 } = {}) {
  const res = await client.get('/api/fornecedores', { params: { limit, offset } });
  return res.data;
}

export async function getFornecedorById(id) {
  const res = await client.get(`/api/fornecedores/${id}`);
  return res.data;
}

export async function createFornecedor(payload) {
  const res = await client.post('/api/fornecedores', payload);
  return res.data;
}

export async function updateFornecedor(id, payload) {
  const res = await client.put(`/api/fornecedores/${id}`, payload);
  return res.data;
}

export async function deleteFornecedor(id) {
  const res = await client.delete(`/api/fornecedores/${id}`);
  return res.data;
}

export async function listFornecedorNomeOptions() {
  const res = await client.get('/api/fornecedores/options/nomes');
  return res.data;
}

export async function listFornecedorCnpjOptions({ nm_fornecedor } = {}) {
  const res = await client.get('/api/fornecedores/options/cnpjs', { params: { nm_fornecedor } });
  return res.data;
}

