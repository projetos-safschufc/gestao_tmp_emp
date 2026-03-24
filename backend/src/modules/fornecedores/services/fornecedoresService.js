const { getPagination } = require('../../../db/dbHelpers');
const {
  listFornecedores,
  getFornecedorById,
  findFornecedorByCnpj,
  createFornecedor,
  updateFornecedor,
  deleteFornecedor,
} = require('../repositories/fornecedoresRepository');

function isDefined(v) {
  return v !== undefined && v !== null;
}

async function listFornecedoresService({ pools, query }) {
  const { limit, offset } = getPagination(query || {});
  const rows = await listFornecedores({ pools, limit, offset });
  return { rows, limit, offset };
}

async function getFornecedorService({ pools, id }) {
  return getFornecedorById({ pools, id });
}

async function createFornecedorService({ pools, input }) {
  const existing = await findFornecedorByCnpj({ pools, cnpj: input.cnpj });
  if (existing) {
    const err = new Error('CNPJ já cadastrado');
    err.statusCode = 409;
    throw err;
  }
  return createFornecedor({ pools, input });
}

async function updateFornecedorService({ pools, id, input }) {
  const toUpdate = {};
  if (isDefined(input.nm_fornecedor)) toUpdate.nm_fornecedor = input.nm_fornecedor;
  if (isDefined(input.cnpj)) toUpdate.cnpj = input.cnpj;
  if (isDefined(input.uf)) toUpdate.uf = input.uf;

  if (isDefined(toUpdate.cnpj)) {
    const existing = await findFornecedorByCnpj({ pools, cnpj: toUpdate.cnpj });
    if (existing && Number(existing.id_forn) !== Number(id)) {
      const err = new Error('CNPJ já cadastrado');
      err.statusCode = 409;
      throw err;
    }
  }

  return updateFornecedor({ pools, id, input: toUpdate });
}

async function deleteFornecedorService({ pools, id }) {
  return deleteFornecedor({ pools, id });
}

module.exports = {
  listFornecedoresService,
  getFornecedorService,
  createFornecedorService,
  updateFornecedorService,
  deleteFornecedorService,
};

