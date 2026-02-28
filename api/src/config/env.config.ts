import { registerAs } from '@nestjs/config';

export default registerAs('app', () => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production' && !process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN must be explicitly set in production');
  }

  return {
    nodeEnv,
    port: parseInt(process.env.PORT || '3000', 10),
    corsOrigin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : [
          'http://localhost:3001',
          'http://localhost:3002',
          'http://localhost:3003',
        ],
  };
});
