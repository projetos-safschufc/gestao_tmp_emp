import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import ForbiddenPage from '../pages/ForbiddenPage.jsx';
import EmpenhosPage from '../pages/EmpenhosPage.jsx';
import FornecedoresPage from '../pages/FornecedoresPage.jsx';
import ProcessosPage from '../pages/ProcessosPage.jsx';
import AcompanhamentoPage from '../pages/AcompanhamentoPage.jsx';
import HistoricoPage from '../pages/HistoricoPage.jsx';
import RelatorioPage from '../pages/RelatorioPage.jsx';
import UsuariosPage from '../pages/UsuariosPage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import RequireAuth from '../auth/RequireAuth.jsx';
import RequireRole from '../auth/RequireRole.jsx';
import Layout from '../components/layout/Layout.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Layout>
              <DashboardPage />
            </Layout>
          </RequireAuth>
        }
      />

      <Route
        path="/empenhos"
        element={
          <RequireAuth>
            <RequireRole allowed={['usuario_leitura', 'usuario_editor', 'gestor', 'administrador']}>
              <Layout>
                <EmpenhosPage />
              </Layout>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/acompanhamento"
        element={
          <RequireAuth>
            <RequireRole allowed={['usuario_leitura', 'usuario_editor', 'gestor', 'administrador']}>
              <Layout>
                <AcompanhamentoPage />
              </Layout>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/historico"
        element={
          <RequireAuth>
            <RequireRole allowed={['usuario_leitura', 'usuario_editor', 'gestor', 'administrador']}>
              <Layout>
                <HistoricoPage />
              </Layout>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/relatorio"
        element={
          <RequireAuth>
            <RequireRole allowed={['usuario_leitura', 'usuario_editor', 'gestor', 'administrador']}>
              <Layout>
                <RelatorioPage />
              </Layout>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/fornecedores"
        element={
          <RequireAuth>
            <RequireRole allowed={['usuario_leitura', 'usuario_editor', 'gestor', 'administrador']}>
              <Layout>
                <FornecedoresPage />
              </Layout>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/processos"
        element={
          <RequireAuth>
            <RequireRole allowed={['usuario_leitura', 'usuario_editor', 'gestor', 'administrador']}>
              <Layout>
                <ProcessosPage />
              </Layout>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route
        path="/usuarios"
        element={
          <RequireAuth>
            <RequireRole allowed={['gestor', 'administrador']}>
              <Layout>
                <UsuariosPage />
              </Layout>
            </RequireRole>
          </RequireAuth>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

