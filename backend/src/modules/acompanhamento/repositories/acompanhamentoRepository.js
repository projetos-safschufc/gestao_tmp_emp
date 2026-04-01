const BaseModel = require('../../../models/BaseModel');

function buildModel({ pools }) {
  return new BaseModel({ pool: pools.safs });
}

function buildEmpenhoFilterSql(empenho) {
  // PDF usa nu_processo e nu_documento_siafi como identificadores.
  return `(e.nu_processo::text = $1 OR e.nu_documento_siafi::text = $1)`;
}

async function listItensByEmpenho({ pools, empenho }) {
  const model = buildModel({ pools });

  // Busca itens do empenho e dados já persistidos no emp_pend (se existirem).
  const query = `
    SELECT
      e.nu_processo,
      e.item,
      e.cd_material,
      CASE
        WHEN e.qt_saldo_item IS NULL THEN e.qt_de_embalagem
        ELSE e.qt_de_embalagem - e.qt_saldo_item
      END AS saldo_empenho,
      e.nu_documento_siafi,
      e.nm_fornecedor,
      e.cd_cgc,
      e.status_item,
      e.status_pedido,

      -- dados do emp_pend (podem ser null se ainda não houver registro)
      p.prazo_entrega_dias,
      p.dt_confirmacao_recebimento,
      p.previsao_entrega,
      CASE
        WHEN p.dt_confirmacao_recebimento IS NOT NULL
          AND CURRENT_DATE > (p.dt_confirmacao_recebimento::date + COALESCE(p.prazo_entrega_dias, 0))
        THEN (
          CURRENT_DATE - (p.dt_confirmacao_recebimento::date + COALESCE(p.prazo_entrega_dias, 0))
        )::integer
        ELSE NULL
      END AS atraso_dias,
      p.status_entrega,
      p.notificacao_codigo,
      p.apuracao_irregularidade,
      p.processo_apuracao,
      p.troca_marca,
      p.processo_troca_marca,
      p.reequilibrio_financeiro,
      p.processo_reequilibrio_financeiro,
      p.aplicacao_imr,
      p.valor_imr,
      p.observacao,
      p.setor_responsavel,
      p.resp_cadastro,
      p.dt_atualiz
    FROM public.empenho e
    LEFT JOIN ctrl_emp.emp_pend p
      ON p.nu_documento_siafi = e.nu_documento_siafi
      AND p.cd_material = e.cd_material
      AND p.nu_processo = e.nu_processo
      AND p.item = e.item::int
    WHERE e.fl_evento = 'Empenho'
      AND ${buildEmpenhoFilterSql(empenho)}
      AND (
        CASE
          WHEN e.qt_saldo_item IS NULL THEN e.qt_de_embalagem
          ELSE e.qt_de_embalagem - e.qt_saldo_item
        END
      ) > 0
    ORDER BY e.nu_processo, e.item
  `;

  const result = await model.query(query, [empenho]);
  return result.rows;
}

async function upsertEmpPendItem({ pools, item, respCadastro }) {
  const model = buildModel({ pools });

  const query = `
    INSERT INTO ctrl_emp.emp_pend (
      nu_processo,
      item,
      cd_material,
      nu_documento_siafi,
      nm_fornecedor,
      cd_cgc,

      prazo_entrega_dias,
      dt_confirmacao_recebimento,
      previsao_entrega,
      status_entrega,
      notificacao_codigo,

      apuracao_irregularidade,
      processo_apuracao,
      troca_marca,
      processo_troca_marca,
      reequilibrio_financeiro,
      processo_reequilibrio_financeiro,

      aplicacao_imr,
      valor_imr,
      observacao,
      setor_responsavel,
      resp_cadastro,
      dt_cadastro,
      dt_atualiz
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16, $17,
      $18, $19, $20, $21, $22,
      NOW(), NOW()
    )
    ON CONFLICT (nu_documento_siafi, cd_material, nu_processo, item)
    DO UPDATE SET
      prazo_entrega_dias = EXCLUDED.prazo_entrega_dias,
      dt_confirmacao_recebimento = EXCLUDED.dt_confirmacao_recebimento,
      previsao_entrega = EXCLUDED.previsao_entrega,
      status_entrega = EXCLUDED.status_entrega,
      notificacao_codigo = EXCLUDED.notificacao_codigo,

      apuracao_irregularidade = EXCLUDED.apuracao_irregularidade,
      processo_apuracao = EXCLUDED.processo_apuracao,
      troca_marca = EXCLUDED.troca_marca,
      processo_troca_marca = EXCLUDED.processo_troca_marca,
      reequilibrio_financeiro = EXCLUDED.reequilibrio_financeiro,
      processo_reequilibrio_financeiro = EXCLUDED.processo_reequilibrio_financeiro,

      aplicacao_imr = EXCLUDED.aplicacao_imr,
      valor_imr = EXCLUDED.valor_imr,
      observacao = EXCLUDED.observacao,
      setor_responsavel = EXCLUDED.setor_responsavel,
      resp_cadastro = EXCLUDED.resp_cadastro,
      dt_atualiz = NOW()
    RETURNING
      nu_processo,
      item,
      cd_material,
      nu_documento_siafi
  `;

  const params = [
    item.nu_processo,
    item.item,
    item.cd_material,
    item.nu_documento_siafi,
    item.nm_fornecedor,
    item.cd_cgc || null,

    item.prazo_entrega_dias ?? 0,
    item.dt_confirmacao_recebimento ?? null,
    item.previsao_entrega ?? null,
    item.status_entrega ?? 'PENDENTE',
    item.notificacao_codigo ?? null,

    item.apuracao_irregularidade,
    item.processo_apuracao ?? null,
    item.troca_marca,
    item.processo_troca_marca ?? null,
    item.reequilibrio_financeiro,
    item.processo_reequilibrio_financeiro ?? null,

    item.aplicacao_imr,
    item.valor_imr ?? null,
    item.observacao ?? null,
    item.setor_responsavel ?? null,
    respCadastro ?? null,
  ];

  const result = await model.query(query, params);
  return result.rows[0];
}

module.exports = {
  listItensByEmpenho,
  upsertEmpPendItem,
};

