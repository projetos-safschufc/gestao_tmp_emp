/**
 * Critério SQL para linhas de public.empenho consideradas "pendentes" na gestão.
 *
 * Motivação: registros com status_pedido = 'Gerado' ainda podem ter quantidade em aberto
 * (qt_saldo_item_emp negativo no modelo SAFS). Excluir todo 'Gerado' ocultava empenhos
 * que seguem exigindo acompanhamento.
 *
 * Uso: sempre com alias de tabela `e` para colunas de empenho.
 */
const SQL_EMPENHO_LINHA_PENDENTE = `(
  e.status_pedido IS DISTINCT FROM 'Gerado'
  OR COALESCE(e.qt_saldo_item_emp, 0) < 0
)`;

module.exports = { SQL_EMPENHO_LINHA_PENDENTE };
