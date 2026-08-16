import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    if (process.env.NODE_ENV === 'test') return fallback ?? `test-${name}`;
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: parseInt(optional('PORT', '5000'), 10),
  apiPrefix: optional('API_PREFIX', '/api'),

  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:3000').split(',').map((o) => o.trim()),

  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/flowdesk'),

  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  jwtAccessExpiresIn: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
  jwtRefreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '30d'),

  passwordResetTokenTtlMinutes: parseInt(optional('PASSWORD_RESET_TOKEN_TTL_MINUTES', '30'), 10),

  rateLimitWindowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  rateLimitMax: parseInt(optional('RATE_LIMIT_MAX', '300'), 10),
  authRateLimitWindowMs: parseInt(optional('AUTH_RATE_LIMIT_WINDOW_MS', '900000'), 10),
  authRateLimitMax: parseInt(optional('AUTH_RATE_LIMIT_MAX', '20'), 10),

  logLevel: optional('LOG_LEVEL', 'info'),

  storageDriver: optional('STORAGE_DRIVER', 'local') as 'local' | 'cloudinary',
  maxUploadSizeMb: parseInt(optional('MAX_UPLOAD_SIZE_MB', '10'), 10),

  cloudinaryCloudName: optional('CLOUDINARY_CLOUD_NAME', ''),
  cloudinaryApiKey: optional('CLOUDINARY_API_KEY', ''),
  cloudinaryApiSecret: optional('CLOUDINARY_API_SECRET', ''),

  clientUrl: optional('CLIENT_URL', 'http://localhost:3000'),
};
