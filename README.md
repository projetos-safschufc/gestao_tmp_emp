## Gestão de Empenho (Fullstack)

Sistema web para gestão e acompanhamento de empenhos, fornecedores e processos administrativos.

### Tecnologias
- Backend: Node.js + Express (API REST)
- Autenticação: JWT
- Autorização: RBAC (4 perfis)
- Frontend: React + Vite
- Banco: PostgreSQL (DW leitura + SAFS leitura/escrita)

## Requisitos
- Node.js (recomendado LTS)
- PostgreSQL acessível a partir da rede onde o backend roda
- Acesso às databases `dw` (somente leitura) e `safs` (leitura/escrita)

## Backend
1. Instalar dependências
   - `cd backend`
   - `npm install`
2. Configurar variáveis de ambiente
   - Crie `backend/.env` a partir de `backend/.env.example` e preencha as credenciais de `dw` e `safs`
3. Subir
   - `npm run dev` (porta `3001`)
4. Endpoint de saúde
   - `GET http://localhost:3001/health`

### SQL (Fase 5)
Executar na base `safs` (schema `ctrl_emp`):
- `backend/sql/000_schema_ctrl_emp.sql`
- `backend/sql/001_users.sql`
- `backend/sql/002_emp_pend.sql`
- `backend/sql/003_fornecedores.sql`
- `backend/sql/004_proc_fornecedores.sql`

### Automatizacao (recomendado)
Para criar os objetos no banco de forma automatizada (mesma ordem dos scripts):
- `cd backend`
- `npm run db:init:ctrl_emp`

## Frontend
1. Instalar dependências
   - `cd frontend`
   - `npm install`
2. Configurar
   - Crie `frontend/.env` a partir de `frontend/.env.example` (define `VITE_API_BASE_URL`)
3. Subir
   - `npm run dev` (porta `5181`, com fallback para a próxima livre)
4. Acessar
   - `http://localhost:5181/login` (se 5181 estiver ocupada, use a porta que o Vite indicar no log)

## Perfis (RBAC)
- `usuario_leitura`: visualização
- `usuario_editor`: leitura + escrita (sem permissões admin)
- `gestor`: controle completo + gerencia permissões
- `administrador`: acesso total ao sistema

## Como testar rápido (fluxo)
1. Rodar backend e frontend
2. Login na tela do frontend
3. Validar acesso às páginas:
   - `/empenhos`, `/fornecedores`, `/processos`, `/acompanhamento`, `/historico`, `/usuarios`

## Observações
- O backend loga erros com `X-Request-Id` (middleware `requestId`) e trata erros via `errorHandler`.
- Nesta implementação inicial, algumas telas (como Dashboard e Histórico) estão com UI placeholder até os endpoints completos estarem implementados.

