module.exports = {
  apps: [
    {
      name: 'captchamaster-api',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      max_memory_restart: '1G',
      listen_timeout: 5000,
      kill_timeout: 5000,
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
