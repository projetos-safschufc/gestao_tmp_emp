import client from './axiosClient';

export async function listAcompanhamentoItens({ empenho } = {}) {
  const res = await client.get('/api/acompanhamento/itens', { params: { empenho } });
  return res.data;
}

export async function upsertAcompanhamento({ items }) {
  const res = await client.post('/api/acompanhamento/upsert', { items });
  return res.data;
}

