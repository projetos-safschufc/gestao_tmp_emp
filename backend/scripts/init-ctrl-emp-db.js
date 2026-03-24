// Inicializa schema/tabelas do sistema no banco SAFS (schema ctrl_emp).
// Executa os scripts em ordem para garantir dependencias de schema e tabelas.
//
// Rodar via:
//   npm run db:init:ctrl_emp

const path = require('path');
const fs = require('fs/promises');

require('dotenv').config();
const { createDbPools } = require('../src/db/pools');

const SQL_FILES = [
  '000_schema_ctrl_emp.sql',
  '001_users.sql',
  '002_emp_pend.sql',
  '003_fornecedores.sql',
  '004_proc_fornecedores.sql',
];

async function loadSqlFiles(sqlDir) {
  const results = [];
  for (const file of SQL_FILES) {
    const fullPath = path.join(sqlDir, file);
    const content = await fs.readFile(fullPath, 'utf8');
    results.push({ file, content });
  }
  return results;
}

async function main() {
  const pools = createDbPools();
  let failed = false;

  try {
    const sqlDir = path.join(__dirname, '..', 'sql');
    const sqlFiles = await loadSqlFiles(sqlDir);

    console.log(`Iniciando init do banco ctrl_emp (${SQL_FILES.length} scripts)...`);

    for (const { file, content } of sqlFiles) {
      console.log(`Executando: ${file}`);
      // Os arquivos possuem múltiplos comandos SQL; o pg permite executar o lote.
      await pools.safs.query(content);
    }

    console.log('Init do banco ctrl_emp concluido com sucesso.');
  } catch (err) {
    failed = true;
    console.error('Falha ao inicializar ctrl_emp:', err?.message || err);
    // Mantem stack para diagnostico
    console.error(err);
    process.exitCode = 1;
  } finally {
    // Garante encerramento de pools (mesmo em falhas)
    try {
      await Promise.allSettled([pools.dw.end(), pools.safs.end()]);
    } catch {
      // ignora erros no shutdown
    }
    if (failed) process.exit(1);
  }
}

main();

