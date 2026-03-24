function requireAnyRole(roles = []) {
  const normalized = roles.map((r) => String(r).toLowerCase());

  return function rbac(req, res, next) {
    const perfil = (req.user && req.user.perfil) ? String(req.user.perfil).toLowerCase() : '';

    if (!perfil) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Usuário não autenticado' });
    }

    if (normalized.length === 0) {
      // Se nenhum role foi passado, libera por padrão.
      return next();
    }

    if (!normalized.includes(perfil)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Sem permissão para esta rota' });
    }

    return next();
  };
}

module.exports = { requireAnyRole };

