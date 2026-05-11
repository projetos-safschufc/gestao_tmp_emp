ALTER TABLE ctrl_emp.proc_fornecedores
  ADD COLUMN IF NOT EXISTS setor_controle TEXT NOT NULL DEFAULT 'UACE';
