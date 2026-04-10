-- Cadastro de fornecedores (ctrl_emp.fornecedores)

CREATE TABLE IF NOT EXISTS ctrl_emp.fornecedores (
  id_forn BIGSERIAL PRIMARY KEY,
  nm_fornecedor TEXT NOT NULL,
  cnpj TEXT,
  uf CHAR(2) NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evita duplicidade por CNPJ (CNPJ normalizado no backend)
CREATE UNIQUE INDEX IF NOT EXISTS ux_fornecedores_cnpj
  ON ctrl_emp.fornecedores (cnpj);

CREATE INDEX IF NOT EXISTS ix_fornecedores_uf
  ON ctrl_emp.fornecedores (uf);

CREATE INDEX IF NOT EXISTS ix_fornecedores_nome
  ON ctrl_emp.fornecedores (nm_fornecedor);

