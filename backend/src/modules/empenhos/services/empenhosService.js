const { getPagination } = require('../../../db/dbHelpers');
const { getEmpenhosPendentes, getStatusPedidoOptions } = require('../../../integrations/dwSafs/empenhosPendentesIntegrationService');
const BaseModel = require('../../../models/BaseModel');

async function listEmpenhosPendentesService({ pools, query }) {
  const { limit, offset } = getPagination(query || {});
  const filters = {
    fornecedor: query?.fornecedor,
    codigo_material: query?.codigo_material,
    empenho: query?.empenho,
    responsavel: query?.responsavel,
    setor: query?.setor,
    status_pedido: query?.status_pedido,
  };


  return getEmpenhosPendentes({
    pools,
    filters,
    limit,
    offset,
  });
}

async function getResponsaveisOptionsService({ pools }) {
  const modelSAFS = new BaseModel({ pool: pools.safs });
  
  try {
    const query = `
      SELECT DISTINCT s.resp_controle as responsavel
      FROM "ctrl"."safs_catalogo" s
      WHERE s.resp_controle IS NOT NULL 
        AND s.resp_controle != ''
        AND s.ativo = true
      ORDER BY s.resp_controle
      LIMIT 100
    `;
    
    const result = await modelSAFS.query(query, []);
    const options = result.rows
      .map(row => ({ value: row.responsavel, label: row.responsavel }))
      .filter(opt => opt.value && opt.value.trim());
    
    return { options };
  } catch (err) {
    console.warn('Erro ao buscar opções de responsáveis:', err.message);
    return { options: [] };
  }
}

async function getStatusPedidoOptionsService({ pools, query }) {
  const filters = {
    fornecedor: query?.fornecedor,
    codigo_material: query?.codigo_material,
    empenho: query?.empenho,
    responsavel: query?.responsavel,
    setor: query?.setor,
    // intencionalmente ignoramos query.status_pedido para montar opções dinâmicas
  };

  const values = await getStatusPedidoOptions({ pools, filters });
  const options = values.map((v) => ({ value: v, label: v }));
  return { options };
}

module.exports = { listEmpenhosPendentesService, getResponsaveisOptionsService, getStatusPedidoOptionsService };

