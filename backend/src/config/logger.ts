import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.logLevel,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'currentPassword',
      'newPassword',
      '*.password',
      '*.token',
      'MONGODB_URI',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
    ],
    censor: '[REDACTED]',
  },
  transport:
    env.nodeEnv === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
      : undefined,
});
