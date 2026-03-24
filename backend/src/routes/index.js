const express = require('express');
const { buildAuthRouter } = require('../modules/auth/routes/authRoutes');
const { buildUsersRouter } = require('../modules/users/routes/usersRoutes');
const { buildFornecedoresRouter } = require('../modules/fornecedores/routes/fornecedoresRoutes');
const { buildEmpenhosRouter } = require('../modules/empenhos/routes/empenhosRoutes');
const { buildAcompanhamentoRouter } = require('../modules/acompanhamento/routes/acompanhamentoRoutes');
const { buildProcessosRouter } = require('../modules/processos/routes/processosRoutes');
const { buildDashboardRouter } = require('../modules/dashboard/routes/dashboardRoutes');
const { buildHistoricoRouter } = require('../modules/historico/routes/historicoRoutes');

function buildRouter({ pools } = {}) {
  const router = express.Router();

  router.use('/auth', buildAuthRouter({ pools }));
  router.use('/users', buildUsersRouter({ pools }));
  router.use('/fornecedores', buildFornecedoresRouter({ pools }));
  router.use('/empenhos', buildEmpenhosRouter({ pools }));
  router.use('/acompanhamento', buildAcompanhamentoRouter({ pools }));
  router.use('/processos', buildProcessosRouter({ pools }));
  router.use('/dashboard', buildDashboardRouter({ pools }));
  router.use('/historico', buildHistoricoRouter({ pools }));

  return router;
}

module.exports = { buildRouter };

