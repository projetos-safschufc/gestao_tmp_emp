const { getPagination } = require('../../../db/dbHelpers');
const {
  listEmpenhosBaseByEmpenho,
  countEmpenhosBaseByEmpenho,
  listConsumoEstoqueByMateriais,
  listEmpPendByEmpenho,
} = require('../repositories/relatoriosRepository');

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function getRelatorioConsolidadoService({ pools, query }) {
  const { limit, offset } = getPagination(query || {});
  const empenho = query.empenho;

  const [baseRows, total] = await Promise.all([
    listEmpenhosBaseByEmpenho({ pools, empenho, limit, offset }),
    countEmpenhosBaseByEmpenho({ pools, empenho }),
  ]);

  const materiais = [...new Set(baseRows.map((r) => String(r.cd_material)).filter(Boolean))];
  const consumoRows = await listConsumoEstoqueByMateriais({ pools, materiais });
  const consumoByMaterial = new Map(consumoRows.map((r) => [String(r.cd_material), r]));

  const rows = baseRows.map((r) => {
    const c = consumoByMaterial.get(String(r.cd_material)) || {};
    const estoque = toNumber(c.qtde_em_estoque);
    const media6m = toNumber(c.media_mensal_dos_ultimos_6_meses);
    const cobertura = estoque !== null && media6m !== null && media6m > 0 ? estoque / media6m : null;

    return {
      nu_processo: r.nu_processo,
      nu_documento_siafi: r.nu_documento_siafi,
      item: r.item,
      cd_material: r.cd_material,
      material: r.material || r.cd_material,
      nm_fornecedor: r.nm_fornecedor,
      status_pedido: r.status_pedido,
      status_item: r.status_item,
      qtde_pendente: toNumber(r.qtde_pendente),
      valor_unitario_empenho: toNumber(r.valor_unitario_empenho),

      qtde_em_estoque: estoque,
      valor_em_estoque: toNumber(c.valor_em_estoque),
      media_mensal_6m: media6m,
      consumo_mes_atual: toNumber(c.consumo_mes_atual),
      consumo_ultimo_mes: toNumber(c.consumo_ultimo_mes),
      ultimo_mes_10_: c.ultimo_mes_10_ ?? null,
      ultimo_6_meses_10_: c.ultimo_6_meses_10_ ?? null,
      consumo_acima_mes: c.consumo_acima_mes ?? null,
      consumo_acima_media: c.consumo_acima_media ?? null,
      desfecho_indicador: c.desfecho_indicador ?? null,
      qtde_licitada: toNumber(c.qtde_licitada),
      qtde_empenhada: toNumber(c.qtde_empenhada),
      qtde_a_empenhar: toNumber(c.qtde_a_empenhar),
      qtde_a_receber: toNumber(c.qtde_a_receber),
      cobertura_estoque_meses: cobertura,
    };
  });

  return {
    rows,
    total,
    limit,
    offset,
    meta: { empenho },
  };
}

function faixaCobertura(coberturaMeses) {
  if (coberturaMeses === null || coberturaMeses === undefined) return 'Sem base';
  if (coberturaMeses < 1) return 'Crítico';
  if (coberturaMeses < 2) return 'Atenção';
  return 'Adequado';
}

function riscoRupturaFromRows(items) {
  if (!items.length) return 'Sem dados';
  const hasCritico = items.some((i) => i.cobertura_indicador === 'Crítico');
  const hasAtrasoAlto = items.some((i) => (i.tempo_atraso_dias || 0) > 15);
  if (hasCritico || hasAtrasoAlto) return 'Alto';
  const hasAtencao = items.some((i) => i.cobertura_indicador === 'Atenção');
  if (hasAtencao) return 'Médio';
  return 'Baixo';
}

async function getRelatorioDiagnosticoService({ pools, query }) {
  const empenho = query.empenho;
  const pendRows = await listEmpPendByEmpenho({ pools, empenho });

  const materiais = [...new Set(pendRows.map((r) => String(r.cd_material)).filter(Boolean))];
  const consumoRows = await listConsumoEstoqueByMateriais({ pools, materiais });
  const consumoByMaterial = new Map(consumoRows.map((r) => [String(r.cd_material), r]));

  const itens = pendRows.map((r) => {
    const c = consumoByMaterial.get(String(r.cd_material)) || {};
    const estoque = toNumber(c.qtde_em_estoque);
    const media6m = toNumber(c.media_mensal_dos_ultimos_6_meses);
    const coberturaMeses = estoque !== null && media6m !== null && media6m > 0 ? estoque / media6m : null;
    const qtdePendente = toNumber(c.qtde_a_receber) ?? 0;
    const valorUnit = toNumber(c.valor_unitario) ?? 0;

    return {
      item_pregao: r.item,
      cd_material: r.cd_material,
      material: r.material || r.cd_material,
      estoque: estoque,
      quantidade_pendente: qtdePendente,
      valor_pendente: qtdePendente * valorUnit,
      media_consumo_mensal: media6m,
      consumo_ultimo_mes: toNumber(c.consumo_ultimo_mes),
      cobertura_estoque_meses: coberturaMeses,
      cobertura_indicador: faixaCobertura(coberturaMeses),
      consumo_acima_media: c.consumo_acima_media ?? null,
      desfecho_indicador: c.desfecho_indicador ?? null,
      prazo_entrega_dias: toNumber(r.prazo_entrega_dias),
      tempo_atraso_dias: toNumber(r.tempo_atraso_dias),
    };
  });

  const primeiro = pendRows[0] || {};
  const totalValorPendente = itens.reduce((acc, it) => acc + (Number.isFinite(it.valor_pendente) ? it.valor_pendente : 0), 0);
  const totalQtdPendente = itens.reduce((acc, it) => acc + (Number.isFinite(it.quantidade_pendente) ? it.quantidade_pendente : 0), 0);
  const totalEstoque = itens.reduce((acc, it) => acc + (Number.isFinite(it.estoque) ? it.estoque : 0), 0);
  const coberturas = itens.map((it) => it.cobertura_estoque_meses).filter((n) => Number.isFinite(n));
  const coberturaMedia = coberturas.length ? coberturas.reduce((a, b) => a + b, 0) / coberturas.length : null;

  const payload = {
    identificacao: {
      fornecedor: primeiro.nm_fornecedor || null,
      cnpj: primeiro.cnpj || null,
      numero_empenho: primeiro.nu_documento_siafi || primeiro.nu_processo || empenho,
      processo: primeiro.nu_processo || null,
      data_emissao_relatorio: new Date().toISOString(),
      responsavel_controle: primeiro.setor_responsavel || null,
    },
    resumo: {
      valor_pendente_total: totalValorPendente,
      quantidade_pendente_total: totalQtdPendente,
      quantidade_estoque_total: totalEstoque,
      cobertura_media_estoque_meses: coberturaMedia,
      status_entrega: primeiro.status_entrega || null,
      risco_ruptura: riscoRupturaFromRows(itens),
    },
    compliance_riscos: {
      processo_irregularidade: Boolean(pendRows.some((r) => r.apuracao_irregularidade)),
      troca_marca: Boolean(pendRows.some((r) => r.troca_marca)),
      reequilibrio_financeiro: Boolean(pendRows.some((r) => r.reequilibrio_financeiro)),
      notificacao_codigo: [...new Set(pendRows.map((r) => r.notificacao_codigo).filter(Boolean))],
    },
    timeline_logistica: {
      data_confirmacao_recebimento_email: primeiro.dt_confirmacao_recebimento || null,
      prazo_entrega_dias: toNumber(primeiro.prazo_entrega_dias),
      tempo_atraso_dias: toNumber(primeiro.tempo_atraso_dias),
    },
    itens,
    recomendacoes: {
      acao_sugerida:
        riscoRupturaFromRows(itens) === 'Alto'
          ? 'Priorizar ação imediata com fornecedor e plano de contingência de abastecimento.'
          : 'Manter monitoramento periódico do consumo e cobertura.',
    },
  };

  return payload;
}

module.exports = { getRelatorioConsolidadoService, getRelatorioDiagnosticoService };

