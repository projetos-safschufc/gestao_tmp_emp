import client from './axiosClient';

export async function listEmpenhosPendentes({ limit = 20, offset = 0, status_pedido, fornecedor, codigo_material, empenho, responsavel, setor } = {}) {
  const params = { limit, offset };
  if (status_pedido) params.status_pedido = status_pedido;
  if (fornecedor) params.fornecedor = fornecedor;
  if (codigo_material) params.codigo_material = codigo_material;
  if (empenho) params.empenho = empenho;
  if (responsavel) params.responsavel = responsavel;
  if (setor) params.setor = setor;

  const res = await client.get('/api/empenhos/pendentes', { params });
  return res.data;
}

export async function getResponsaveisOptions() {
  const res = await client.get('/api/empenhos/responsaveis-options');
  return res.data;
}

export async function getStatusPedidoOptions({ fornecedor, codigo_material, empenho, responsavel, setor } = {}) {
  const params = {};
  if (fornecedor) params.fornecedor = fornecedor;
  if (codigo_material) params.codigo_material = codigo_material;
  if (empenho) params.empenho = empenho;
  if (responsavel) params.responsavel = responsavel;
  if (setor) params.setor = setor;

  const res = await client.get('/api/empenhos/status-pedido-options', { params });
  return res.data;
}

