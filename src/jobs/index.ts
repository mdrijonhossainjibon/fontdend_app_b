import logger from '@/utils/logger';

// Background jobs entry point
// Add cron jobs or queue workers here

export const initJobs = (): void => {
  logger.info('Background jobs initialized');
};
