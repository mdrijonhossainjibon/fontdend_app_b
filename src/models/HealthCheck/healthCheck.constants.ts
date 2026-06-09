export const HEALTH_STATUSES = ['up', 'down', 'degraded'] as const
export const HEALTH_SERVICES = [
  'mongodb', 'redis', 'api', 'email', 'queue', 'crypto_payment', 'openai',
] as const
