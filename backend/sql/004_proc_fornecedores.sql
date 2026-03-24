-- Processos administrativos (ctrl_emp.proc_fornecedores)
-- Schema: safs.ctrl_emp

CREATE TABLE IF NOT EXISTS ctrl_emp.proc_fornecedores (
  id_proc BIGSERIAL PRIMARY KEY,

  -- Identificação do processo (valores canonizados pela camada Zod)
  tipo_processo TEXT NOT NULL,
  dt_processo DATE NOT NULL,

  -- Identificação do fornecedor
  nm_fornecedor TEXT NOT NULL,
  cnpj TEXT,
  uf CHAR(2) NOT NULL,

  -- Campos do processo (opcionais)
  processo_acao TEXT,
  processo_origem TEXT,
  item_pregao TEXT,
  edital TEXT,
  empenho TEXT,
  dt_ufac DATE,

  -- Fluxo/estado
  status TEXT NOT NULL,
  dt_conclusao DATE,
  tmp_processo INTEGER,

  -- Sanção
  sancao_aplicada TEXT,
  valor_multa NUMERIC(18,2),

  observacao TEXT,
  anexo JSONB NOT NULL DEFAULT '[]'::jsonb,

  resp_cadastro TEXT,

  dt_cadastro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dt_atualiz TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para paginação/ordenação e filtros mais comuns
CREATE INDEX IF NOT EXISTS ix_proc_fornecedor ON ctrl_emp.proc_fornecedores (nm_fornecedor);
CREATE INDEX IF NOT EXISTS ix_proc_uf ON ctrl_emp.proc_fornecedores (uf);
CREATE INDEX IF NOT EXISTS ix_proc_tipo_processo ON ctrl_emp.proc_fornecedores (tipo_processo);
CREATE INDEX IF NOT EXISTS ix_proc_edital ON ctrl_emp.proc_fornecedores (edital);
CREATE INDEX IF NOT EXISTS ix_proc_empenho ON ctrl_emp.proc_fornecedores (empenho);
CREATE INDEX IF NOT EXISTS ix_proc_dt_atualiz ON ctrl_emp.proc_fornecedores (dt_atualiz);

