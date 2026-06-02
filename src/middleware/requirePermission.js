const { hasPermission } = require('../config/permissions');

function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.adminAuth) {
      return res.status(401).json({ message: 'Unauthorized admin access.' });
    }

    const role = req.adminAuth.role;
    const hasAny = permissions.some((p) => hasPermission(role, p));
    if (!hasAny) {
      return res.status(403).json({ message: `Access denied. Required permission(s): ${permissions.join(', ')}` });
    }

    next();
  };
}

module.exports = { requirePermission };
