import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',

  // MongoDB
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/main_backend',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || process.env.JWT_TOKEN || 'default-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'default-refresh-secret',

  // Auth
  OTP_SECRET: process.env.OTP_SECRET || process.env.JWT_SECRET || 'default-otp-secret',

  // Fingerprint / request signing
  AUTH_FINGERPRINT_SECRET: process.env.AUTH_FINGERPRINT_SECRET || process.env.VITE_AUTH_SECRET || 'your-secret-key-here',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Rate Limit
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 min
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  // SMTP
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@example.com',

  // OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || '',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || '',

  // Captcha
  CAPTCHA_SERVICE_URL: process.env.CAPTCHA_SERVICE_URL || '',
  CAPTCHA_API_KEY: process.env.CAPTCHA_API_KEY || '',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'dev',
} as const;
