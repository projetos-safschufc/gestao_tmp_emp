import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export default function RequireRole({ allowed = [], children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const perfil = user?.perfil;

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!Array.isArray(allowed) || allowed.length === 0) return children;

  const normalizedAllowed = allowed.map((r) => String(r).toLowerCase());
  const normalizedPerfil = perfil ? String(perfil).toLowerCase() : '';

  if (!normalizedAllowed.includes(normalizedPerfil)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}

