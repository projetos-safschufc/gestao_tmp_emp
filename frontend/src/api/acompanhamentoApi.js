import client from './axiosClient';

export async function listAcompanhamentoItens({ empenho, mode = 'novo' } = {}) {
  const res = await client.get('/api/acompanhamento/itens', { params: { empenho, mode } });
  return res.data;
}

export async function upsertAcompanhamento({ items, mode = 'novo' }) {
  const res = await client.post('/api/acompanhamento/upsert', { items, mode });
  return res.data;
}

