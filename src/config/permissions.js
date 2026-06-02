const ROLES = {
  SEO_SMM: 'seo_smm',
  HOSTESS: 'hostess',
  ADMIN: 'admin',
  MANAGER: 'manager',
  OWNER: 'owner'
};

const ROLE_HIERARCHY = {
  [ROLES.SEO_SMM]: 0,
  [ROLES.HOSTESS]: 1,
  [ROLES.ADMIN]: 2,
  [ROLES.MANAGER]: 3,
  [ROLES.OWNER]: 4
};

const PERMISSIONS = {
  'dashboard:view': ['*'],

  'events:view': ['seo_smm', 'admin', 'manager', 'owner'],
  'events:create': ['seo_smm', 'admin', 'manager', 'owner'],
  'events:update': ['seo_smm', 'admin', 'manager', 'owner'],
  'events:delete': ['seo_smm', 'admin', 'manager', 'owner'],

  'news:view': ['seo_smm', 'admin', 'manager', 'owner'],
  'news:create': ['seo_smm', 'admin', 'manager', 'owner'],
  'news:update': ['seo_smm', 'admin', 'manager', 'owner'],
  'news:delete': ['seo_smm', 'admin', 'manager', 'owner'],

  'map:view': ['*'],
  'map:edit': ['admin', 'manager', 'owner'],

  'menu:view': ['admin', 'manager', 'owner'],
  'menu:edit': ['admin', 'manager', 'owner'],

  'reservations:view': ['admin', 'hostess', 'manager', 'owner'],
  'reservations:create': ['admin', 'hostess', 'manager', 'owner'],
  'reservations:create:social': ['seo_smm', 'admin', 'hostess', 'manager', 'owner'],
  'reservations:create:phone': ['admin', 'manager', 'owner'],
  'reservations:update': ['admin', 'hostess', 'manager', 'owner'],
  'reservations:delete': ['admin', 'manager', 'owner'],
  'reservations:arrive': ['admin', 'hostess', 'manager', 'owner'],
  'reservations:verify': ['admin', 'hostess', 'manager', 'owner'],

  'kanban:view': ['admin', 'manager', 'owner'],

  'payments:view': ['admin', 'manager', 'owner'],
  'payments:update': ['admin', 'manager', 'owner'],

  'settings:view': ['seo_smm', 'admin', 'manager', 'owner'],
  'settings:edit': ['seo_smm', 'admin', 'manager', 'owner'],

  'users:view': ['admin', 'manager', 'owner'],
  'users:create': ['admin', 'manager', 'owner'],
  'users:update': ['admin', 'manager', 'owner'],
  'users:delete': ['admin', 'manager', 'owner']
};

function hasPermission(role, permission) {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  if (allowedRoles.includes('*')) return true;
  if (allowedRoles.includes(role)) return true;

  const roleLevel = ROLE_HIERARCHY[role] ?? -1;
  const ownerLevel = ROLE_HIERARCHY[ROLES.OWNER];
  const managerLevel = ROLE_HIERARCHY[ROLES.MANAGER];
  return roleLevel >= managerLevel;
}

function hasAnyPermission(role, permissions) {
  return permissions.some((p) => hasPermission(role, p));
}

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
  hasPermission,
  hasAnyPermission
};
