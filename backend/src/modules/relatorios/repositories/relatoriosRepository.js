const BaseModel = require('../../../models/BaseModel');

function buildSafsModel({ pools }) {
  return new BaseModel({ pool: pools.safs });
}

function buildDwModel({ pools }) {
  return new BaseModel({ pool: pools.dw });
}

async function listEmpenhosBaseByEmpenho({ pools, empenho, limit, offset }) {
  const model = buildSafsModel({ pools });
  const sql = `
    SELECT
      e.nu_processo,
      e.nu_documento_siafi,
      e.item::int AS item,
      e.cd_material,
      e.material,
      e.nm_fornecedor,
      e.status_pedido,
      e.status_item,
      CASE
        WHEN e.qt_saldo_item IS NULL THEN e.qt_de_embalagem
        ELSE e.qt_de_embalagem - e.qt_saldo_item
      END AS qtde_pendente,
      e.vl_unidade AS valor_unitario_empenho
    FROM public.empenho e
    WHERE e.fl_evento = 'Empenho'
      AND e.status_item <> 'Atendido'
      AND e.status_pedido <> 'Gerado'
      AND (e.nu_processo::text = $1 OR e.nu_documento_siafi::text = $1)
    ORDER BY e.nu_processo, e.item
    LIMIT $2 OFFSET $3
  `;
  const result = await model.query(sql, [empenho, limit, offset]);
  return result.rows;
}

async function countEmpenhosBaseByEmpenho({ pools, empenho }) {
  const model = buildSafsModel({ pools });
  const sql = `
    SELECT COUNT(*)::int AS total
    FROM public.empenho e
    WHERE e.fl_evento = 'Empenho'
      AND e.status_item <> 'Atendido'
      AND e.status_pedido <> 'Gerado'
      AND (e.nu_processo::text = $1 OR e.nu_documento_siafi::text = $1)
  `;
  const result = await model.query(sql, [empenho]);
  return result.rows[0]?.total || 0;
}

async function listConsumoEstoqueByMateriais({ pools, materiais }) {
  if (!materiais.length) return [];

  const model = buildDwModel({ pools });
  const sql = `
    SELECT
      cd_material::text AS cd_material,
      qtde_em_estoque,
      valor_em_estoque,
      media_mensal_dos_ultimos_6_meses,
      consumo_mes_atual,
      "z_1º_mes" AS consumo_ultimo_mes,
      ultimo_mes_10_,
      ultimo_6_meses_10_,
      consumo_acima_mes,
      consumo_acima_media,
      desfecho_indicador,
      valor_unitario,
      qtde_licitada,
      qtde_empenhada,
      qtde_a_empenhar,
      qtde_a_receber
    FROM gad_dlih_safs.v_df_consumo_estoque
    WHERE cd_material::text = ANY($1::text[])
  `;
  const result = await model.query(sql, [materiais]);
  return result.rows;
}

async function listEmpPendByEmpenho({ pools, empenho }) {
  const model = buildSafsModel({ pools });
  const sql = `
    SELECT
      p.nu_processo,
      p.nu_documento_siafi,
      p.item::int AS item,
      p.cd_material,
      COALESCE(e.material, p.cd_material) AS material,
      p.nm_fornecedor,
      e.cd_cgc AS cnpj,
      p.status_entrega,
      p.notificacao_codigo,
      p.apuracao_irregularidade,
      p.troca_marca,
      p.reequilibrio_financeiro,
      p.dt_confirmacao_recebimento,
      p.prazo_entrega_dias,
      CASE
        WHEN p.dt_confirmacao_recebimento IS NOT NULL
        THEN p.dt_confirmacao_recebimento + COALESCE(p.prazo_entrega_dias, 0)
        ELSE NULL
      END AS previsao_entrega,
      CASE
        WHEN p.dt_confirmacao_recebimento IS NOT NULL
          AND CURRENT_DATE > (p.dt_confirmacao_recebimento + COALESCE(p.prazo_entrega_dias, 0))
        THEN (CURRENT_DATE - (p.dt_confirmacao_recebimento + COALESCE(p.prazo_entrega_dias, 0)))::int
        ELSE NULL
      END AS tempo_atraso_dias,
      p.observacao,
      p.setor_responsavel
    FROM ctrl_emp.emp_pend p
    LEFT JOIN public.empenho e
      ON e.nu_documento_siafi = p.nu_documento_siafi
      AND e.cd_material = p.cd_material
      AND e.nu_processo = p.nu_processo
      AND e.item::int = p.item::int
    WHERE (p.nu_processo::text = $1 OR p.nu_documento_siafi::text = $1)
    ORDER BY p.item
  `;
  const result = await model.query(sql, [empenho]);
  return result.rows;
}

module.exports = {
  listEmpenhosBaseByEmpenho,
  countEmpenhosBaseByEmpenho,
  listConsumoEstoqueByMateriais,
  listEmpPendByEmpenho,
};

