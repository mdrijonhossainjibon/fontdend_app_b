export const DEFAULT_ROLES = ['admin', 'user', 'moderator'] as const
export const DEFAULT_PERMISSIONS = [
  'users.read', 'users.write', 'users.delete',
  'payments.read', 'payments.write',
  'settings.read', 'settings.write',
  'analytics.read',
] as const
