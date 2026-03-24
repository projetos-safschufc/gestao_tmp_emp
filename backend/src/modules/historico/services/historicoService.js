const { getPagination } = require('../../../db/dbHelpers');
const { listHistorico, countHistorico } = require('../repositories/historicoRepository');

async function historicoService({ pools, query }) {
  const { limit, offset } = getPagination(query || {});
  const [rows, total] = await Promise.all([
    listHistorico({ pools, query, limit, offset }),
    countHistorico({ pools, query }),
  ]);

  return { rows, total, limit, offset };
}

module.exports = { historicoService };

