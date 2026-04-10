const { getPagination } = require('../../../db/dbHelpers');
const {
  listFornecedores,
  getFornecedorById,
  findFornecedorByCnpj,
  findFornecedorByUniqueFieldsNoCnpj,
  listFornecedorNomesFromEmpenho,
  listFornecedorCnpjsFromEmpenho,
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
  if (input.cnpj) {
    const existing = await findFornecedorByCnpj({ pools, cnpj: input.cnpj });
    if (existing) {
      const err = new Error('CNPJ já cadastrado');
      err.statusCode = 409;
      throw err;
    }
  } else {
    const existingNoCnpj = await findFornecedorByUniqueFieldsNoCnpj({ pools, input });
    if (existingNoCnpj) {
      const err = new Error('Fornecedor já cadastrado sem CNPJ com os mesmos dados');
      err.statusCode = 409;
      throw err;
    }
  }
  return createFornecedor({ pools, input });
}

async function updateFornecedorService({ pools, id, input }) {
  const toUpdate = {};
  if (isDefined(input.nm_fornecedor)) toUpdate.nm_fornecedor = input.nm_fornecedor;
  if (isDefined(input.cnpj)) toUpdate.cnpj = input.cnpj;
  if (isDefined(input.uf)) toUpdate.uf = input.uf;
  if (isDefined(input.tel)) toUpdate.tel = input.tel;
  if (isDefined(input.email)) toUpdate.email = input.email;

  if (isDefined(toUpdate.cnpj) && toUpdate.cnpj) {
    const existing = await findFornecedorByCnpj({ pools, cnpj: toUpdate.cnpj });
    if (existing && Number(existing.id_forn) !== Number(id)) {
      const err = new Error('CNPJ já cadastrado');
      err.statusCode = 409;
      throw err;
    }
  }

  if (isDefined(toUpdate.cnpj) && !toUpdate.cnpj) {
    const atual = await getFornecedorById({ pools, id });
    if (!atual) return null;
    const existingNoCnpj = await findFornecedorByUniqueFieldsNoCnpj({
      pools,
      input: {
        nm_fornecedor: toUpdate.nm_fornecedor ?? atual.nm_fornecedor,
        uf: toUpdate.uf ?? atual.uf,
        tel: toUpdate.tel ?? atual.tel,
        email: toUpdate.email ?? atual.email,
      },
    });
    if (existingNoCnpj && Number(existingNoCnpj.id_forn) !== Number(id)) {
      const err = new Error('Fornecedor já cadastrado sem CNPJ com os mesmos dados');
      err.statusCode = 409;
      throw err;
    }
  }

  return updateFornecedor({ pools, id, input: toUpdate });
}

async function deleteFornecedorService({ pools, id }) {
  return deleteFornecedor({ pools, id });
}

async function listFornecedorNomesFromEmpenhoService({ pools }) {
  const values = await listFornecedorNomesFromEmpenho({ pools });
  const options = values.map((v) => ({ value: v, label: v }));
  return { options };
}

async function listFornecedorCnpjsFromEmpenhoService({ pools, nmFornecedor }) {
  const values = await listFornecedorCnpjsFromEmpenho({ pools, nmFornecedor });
  const options = values.map((v) => ({ value: v, label: v }));
  return { options };
}

module.exports = {
  listFornecedoresService,
  getFornecedorService,
  createFornecedorService,
  updateFornecedorService,
  deleteFornecedorService,
  listFornecedorNomesFromEmpenhoService,
  listFornecedorCnpjsFromEmpenhoService,
};

