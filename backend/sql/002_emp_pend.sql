-- Controle de acompanhamento de empenhos
-- Schema: safs.ctrl_emp

CREATE TABLE IF NOT EXISTS ctrl_emp.emp_pend (
  id BIGSERIAL PRIMARY KEY,

  -- Identificadores para re-cálculo/consulta
  nu_processo TEXT NOT NULL,
  item INTEGER NOT NULL,
  cd_material TEXT NOT NULL,
  nu_documento_siafi TEXT NOT NULL,

  nm_fornecedor TEXT NOT NULL,
  cd_cgc TEXT,

  status_pedido TEXT,
  status_item TEXT,

  -- Campos editáveis (conforme tela de acompanhamento)
  prazo_entrega_dias INTEGER NOT NULL DEFAULT 0,
  dt_confirmacao_recebimento DATE,
  previsao_entrega DATE,
  status_entrega TEXT NOT NULL DEFAULT 'PENDENTE',
  notificacao_codigo TEXT,

  apuracao_irregularidade BOOLEAN NOT NULL DEFAULT FALSE,
  processo_apuracao TEXT,

  troca_marca BOOLEAN NOT NULL DEFAULT FALSE,
  processo_troca_marca TEXT,

  reequilibrio_financeiro BOOLEAN NOT NULL DEFAULT FALSE,
  processo_reequilibrio_financeiro TEXT,

  aplicacao_imr BOOLEAN NOT NULL DEFAULT FALSE,
  valor_imr NUMERIC(18,2),

  observacao TEXT,

  setor_responsavel TEXT,
  resp_controle TEXT,
  resp_cadastro TEXT,

  dt_cadastro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dt_atualiz TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Uma entrada por empenho+item (chave lógica baseada nos campos de consulta)
CREATE UNIQUE INDEX IF NOT EXISTS ux_emp_pend_chave_logica
  ON ctrl_emp.emp_pend (nu_documento_siafi, cd_material, nu_processo, item);

CREATE INDEX IF NOT EXISTS ix_emp_pend_status_entrega
  ON ctrl_emp.emp_pend (status_entrega);

CREATE INDEX IF NOT EXISTS ix_emp_pend_fornecedor
  ON ctrl_emp.emp_pend (nm_fornecedor);

CREATE INDEX IF NOT EXISTS ix_emp_pend_material
  ON ctrl_emp.emp_pend (cd_material);

