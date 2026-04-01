const { getPagination } = require('../../../db/dbHelpers');
const { listHistorico, countHistorico, listHistoricoResponsaveisOptions } = require('../repositories/historicoRepository');

async function historicoService({ pools, query }) {
  const { limit, offset } = getPagination(query || {});
  const [rows, total] = await Promise.all([
    listHistorico({ pools, query, limit, offset }),
    countHistorico({ pools, query }),
  ]);

  return { rows, total, limit, offset };
}

async function getHistoricoResponsaveisOptionsService({ pools }) {
  const values = await listHistoricoResponsaveisOptions({ pools });
  const options = values.map((v) => ({ value: v, label: v }));
  return { options };
}

module.exports = { historicoService, getHistoricoResponsaveisOptionsService };

