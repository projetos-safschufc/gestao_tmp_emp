# Manual de manutenção técnica — Gestão de Empenho

Documento orientado a desenvolvedores e administradores de sistema que precisam evoluir, depurar ou operar a aplicação **app_gestao_emp**.

---

## 1. Visão geral da aplicação

| Camada | Tecnologia | Local no repositório |
|--------|------------|----------------------|
| Frontend | React (Vite), React Router, Tailwind CSS | `frontend/` |
| Backend | Node.js, Express, JWT, Zod, `pg` | `backend/` |
| Banco | PostgreSQL (pool principal **SAFS**; integrações com DW quando configurado) | Scripts em `backend/sql/`, acesso em `backend/src/modules/*/repositories/` |

- **Autenticação:** JWT; perfis RBAC (`usuario_leitura`, `usuario_editor`, `gestor`, `administrador`).
- **API REST:** prefixo típico `/api` (montagem no servidor Express).
- **Manual do usuário (PDF):** link na sidebar aponta para `VITE_API_BASE_URL` + `/manual-usuario` (servido pelo backend, se configurado).

---

## 2. Arquitetura de pastas (referência rápida)

```
frontend/src/
  pages/           # Telas principais (formulários e listagens)
  api/             # Cliente HTTP (axios) por domínio
  components/      # UI reutilizável (Layout, Sidebar, Table, Input, Select, Button)
  auth/            # Provider, rotas protegidas, perfis
  routes/          # AppRoutes.jsx — mapa de rotas × páginas

backend/src/
  modules/         # Domínios: auth, users, empenhos, acompanhamento, historico, relatorios,
                   # fornecedores, processos, dashboard
  db/              # Pools de conexão
  middlewares/     # authJwt, rbac
  integrations/    # Ex.: integração DW/SAFS para empenhos pendentes

backend/sql/       # DDL e migrações incrementais (ordem no init)
backend/scripts/   # init-ctrl-emp-db.js — aplicação dos SQLs no banco SAFS
```

---

## 3. Banco de dados — ênfase em tabelas e visões

A aplicação usa principalmente o schema **`ctrl_emp`** no banco conectado ao pool **SAFS**. Há leitura de dados legados/transacionais em **`public`**, **`ctrl`** e visão em **`gad_dlih_safs`**.

### 3.1 Tabelas do schema `ctrl_emp` (criadas/mantidas pelo projeto)

| Tabela | Finalidade |
|--------|------------|
| **`ctrl_emp.usuarios`** | Usuários do sistema (login, perfil, status). |
| **`ctrl_emp.emp_pend`** | Acompanhamento por item de empenho: prazos, confirmação de e-mail, status de entrega, flags (apuração, troca de marca, reequilíbrio, IMR), observações, responsáveis. Chave lógica única: `(nu_documento_siafi, cd_material, nu_processo, item)`. |
| **`ctrl_emp.fornecedores`** | Cadastro local de fornecedores (nome, CNPJ, UF, telefone, e-mail). |
| **`ctrl_emp.proc_fornecedores`** | Processos administrativos ligados a fornecedor (tipo, datas, edital, empenho, sanção, anexos JSONB, **setor_controle** UACE/ULOG, etc.). |

**Scripts SQL (ordem de init):** `000_schema_ctrl_emp.sql` → `001_users.sql` → `002_emp_pend.sql` → `003_fornecedores.sql` → `004_proc_fornecedores.sql` → `005_proc_fornecedores_setor_controle.sql` (coluna `setor_controle` em `proc_fornecedores`, se aplicável ao ambiente).

Comando de inicialização DDL no backend:

```bash
cd backend && npm run db:init:ctrl_emp
```

### 3.2 Tabelas e visões externas ao `ctrl_emp` (somente leitura / integração)

| Objeto | Esquema | Uso típico |
|--------|---------|------------|
| **`public.empenho`** | `public` | Itens de empenho, saldos, fornecedor, documento SIAFI, status de item/pedido. Base para Empenhos, Acompanhamento (modo novo), joins no Dashboard e Histórico. |
| **`public.nf_empenho`** | `public` | Notas/liquidação; agregação `MAX(data)` por empenho com `situacao = 'Liquidado'` para derivar **data liquidada** e regras de **status entrega**. |
| **`public.outlook`** | `public` | Join opcional em consultas de empenhos. |
| **`ctrl.safs_catalogo`** | `ctrl` | Catálogo de materiais; `master` × `cd_material` para setor/responsável e enriquecimento de linhas. |
| **`gad_dlih_safs.v_df_consumo_estoque`** | `gad_dlih_safs` | Visão usada em relatórios de diagnóstico (consumo/estoque). |
| **`information_schema.tables` / `columns`** | `information_schema` | Metadados (ex.: integração DW) — não são dados de negócio. |

> **Manutenção:** alterações em nomes de colunas ou chaves em `public.*` quebram queries nos repositórios. Sempre validar com `EXPLAIN` / ambiente de homologação antes de produção.

### 3.3 Regras de negócio ligadas ao banco (manutenção frequente)

- **Status entrega (Histórico e Acompanhamento — exibição):** se existir data de liquidação (`nf_empenho` liquidado) para o empenho/documento, o status exibido tende a **`ENTREGUE`**; caso contrário, usa-se `emp_pend.status_entrega` (valor editado no acompanhamento). Implementação: `historicoRepository.js`, `acompanhamentoRepository.js` (join em `nf_empenho` agregado).
- **E-mail de fornecedores:** múltiplos endereços separados por `;`, validados no backend (`fornecedoresSchemas.js`) e normalizados antes do `INSERT`/`UPDATE`.
- **Processos — `setor_controle`:** enum lógico `UACE` | `ULOG`; persistido em `proc_fornecedores.setor_controle`.

---

## 4. Módulos backend × rotas API

| Prefixo aproximado | Módulo | Observação |
|---------------------|--------|------------|
| `/api/auth` | `auth` | Login, tokens. |
| `/api/users` | `users` | Gestão de usuários (conforme rotas implementadas). |
| `/api/fornecedores` | `fornecedores` | CRUD fornecedores + opções de nome/CNPJ a partir de `empenho`. |
| `/api/empenhos` | `empenhos` | Listagem/consulta de empenhos com joins. |
| `/api/acompanhamento` | `acompanhamento` | `GET /itens`, `POST /upsert` — grava em `emp_pend`. |
| `/api/historico` | `historico` | Listagem paginada + opções de responsáveis. |
| `/api/relatorios` | `relatorios` | Diagnóstico (inclui visão de consumo/estoque). |
| `/api/processos` | `processos` | CRUD processos; upload de anexos em `uploads/proc_fornecedores`. |
| `/api/dashboard` | `dashboard` | Métricas e agregações. |

Arquivo central de rotas: `backend/src/routes/index.js`.

---

## 5. Frontend — rotas e formulários por tela

Componentes de formulário reutilizados: `Input`, `Select`, `Button`, `Table` (`frontend/src/components/ui/`). Layout com **sidebar** + **área principal**.

### 5.1 Mapa de rotas (`AppRoutes.jsx`)

| Rota | Página | Papel / RBAC |
|------|--------|----------------|
| `/login`, `/register`, `/cadastro` | Login, cadastro | Público ou fluxo específico |
| `/dashboard` | `DashboardPage` | Autenticado |
| `/empenhos` | `EmpenhosPage` | Leitura+ |
| `/acompanhamento` | `AcompanhamentoPage` | Leitura+ |
| `/historico` | `HistoricoPage` | Leitura+ |
| `/relatorio` | `RelatorioPage` | Leitura+ |
| `/fornecedores` | `FornecedoresPage` | Leitura+ |
| `/processos` | `ProcessosPage` | Leitura+ |
| `/usuarios` | `UsuariosPage` | Restrito (ex.: admin para algumas ações) |

### 5.2 Funcionalidade dos formulários e fluxos (resumo)

- **Login / Register**  
  - Credenciais e registro conforme `auth` + páginas em `LoginPage.jsx`, `RegisterPage.jsx`.

- **Dashboard (`DashboardPage.jsx`)**  
  - Visualização de indicadores; dados vindos de agregações sobre `emp_pend`, `empenho`, etc. Manutenção: `dashboardRepository.js`, `dashboardInsights.js`.

- **Empenhos (`EmpenhosPage.jsx`)**  
  - Filtros e tabela de itens de empenho; leitura com joins (`empenho`, `outlook`, `safs_catalogo`, `emp_pend`). Sem persistência de negócio principal nesta tela além do que vier das APIs de listagem.

- **Acompanhamento (`AcompanhamentoPage.jsx`)**  
  - Busca por empenho; modo **Novo acompanhamento** vs **Histórico**.  
  - Formulário: prazo, data confirmação, status entrega, notificação, checkboxes (apuração, troca de marca, IMR), setor, observação.  
  - **Persistência:** `POST /api/acompanhamento/upsert` → `ctrl_emp.emp_pend`.  
  - **Regra UI:** com `status_entrega === ENTREGUE` (incluindo derivado por liquidação), campos e **Salvar histórico** desabilitados; `onSalvar` bloqueia gravação.  
  - Modo histórico: campos já parcialmente read-only + salvamento “histórico” conforme serviço.

- **Histórico (`HistoricoPage.jsx`)**  
  - Filtros: empenho, material, fornecedor, responsável, status entrega.  
  - Tabela com ordenação por colunas; exportação PDF/Excel (`historicoExport.js`).  
  - Dados: `GET /api/historico` — alinhado à regra de status entrega + liquidado.

- **Relatório (`RelatorioPage.jsx`)**  
  - Filtro por empenho; diagnóstico consolidado; exportação **jsPDF** + **jspdf-autotable**.  
  - Exibe **data de geração** do relatório; nome do arquivo PDF com carimbo `dd-mm-aaaa_hh-mm-ss`.

- **Fornecedores (`FornecedoresPage.jsx`)**  
  - Filtros; cadastro/edição com origem “novo” ou “base”; e-mail(s) com `;`; tabela com e-mails em múltiplas linhas.  
  - API: `/api/fornecedores`.

- **Processos (`ProcessosPage.jsx`)**  
  - Filtros (inclui **Setor controle** UACE/ULOG; sem filtro UF na listagem conforme evolução recente).  
  - Formulário completo + anexos (multipart no backend).  
  - Botões: novo, editar (seleção única), excluir, salvar/atualizar.  
  - API: `/api/processos`.

- **Usuários (`UsuariosPage.jsx`)**  
  - Listagem, criação, reset de senha, alteração de perfil/status (conforme perfil do usuário logado).  
  - API: `/api/users` (e relacionados).

### 5.3 Design system (manutenção de UI)

- **Framework CSS:** Tailwind (classes utilitárias no JSX).
- **Paleta institucional (referência):**  
  - Sidebar desktop: `#8BC547`  
  - Overlay / mobile / acentos escuros: `#145D50`  
  - Fundo de conteúdo: `bg-slate-50`; cartões: `border-slate-200`, `bg-white`.  
  - Botão primário: componente `Button` (variantes `secondary`, `danger`, etc.).  
- **Layout:** `Layout.jsx` — título da rota por `pathname`; sidebar responsiva com drawer em mobile.  
- **Tabelas:** componente `Table.jsx` — paginação, ordenação quando implementada na página.

Para alterar identidade visual de forma consistente, priorizar **Sidebar**, **Header**, **Button** e tokens Tailwind repetidos nas páginas.

---

## 6. Variáveis de ambiente e operação

- **Backend:** `dotenv` — credenciais PostgreSQL, JWT, URLs (consultar `.env` de exemplo no projeto ou documentação interna da equipe).  
- **Frontend:** `import.meta.env.VITE_*` (ex.: `VITE_API_BASE_URL` para API e manual).

**Pools:** configurados em `backend/src/db/pools.js` (tipicamente `safs` e opcionalmente `dw` para integrações).

---

## 7. Boas práticas de manutenção

1. **Mudanças de schema:** criar novo arquivo numerado em `backend/sql/` e incluir em `backend/scripts/init-ctrl-emp-db.js` na ordem correta; em produção, rodar migração equivalente (o init completo pode não ser desejável em DB já populado).  
2. **Validação de entrada:** preferir ajustar schemas **Zod** em `validators/` junto com o repositório.  
3. **Performance:** filtros com `ILIKE` e joins em tabelas grandes (`empenho`) — revisar índices no banco corporativo, não apenas no `ctrl_emp`.  
4. **Anexos de processos:** diretório `uploads/proc_fornecedores` — backup e permissões de disco em deploy.  
5. **Testes:** `npm test` no backend aponta para testes existentes (ex.: dashboard); expandir conforme criticidade.

---

## 8. Glossário rápido

| Termo | Significado |
|-------|-------------|
| **Empenho / SIAFI** | Identificadores de processo e documento no mundo Oracle/SAFS. |
| **emp_pend** | Tabela de “pendências/controle” editável pela tela de Acompanhamento. |
| **Liquidado** | Situação em `nf_empenho` usada para inferir entrega concluída na UI. |

---

## 9. Contato e evolução deste manual

- Atualizar este arquivo sempre que:  
  - novas tabelas/colunas forem referenciadas nos repositórios;  
  - novas rotas ou telas forem adicionadas;  
  - regras de negócio (status entrega, e-mails, setor controle) forem alteradas.

**Última sugestão de revisão:** conferir `git diff` em `*_Repository.js` e `frontend/src/pages/*.jsx` a cada release.

---

*Documento gerado para suporte à manutenção técnica do repositório app_gestao_emp.*
