import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['dev', 'staging', 'prod']).default('dev'),
  PORT: z.coerce.number().optional(),
  APP_PORT: z.coerce.number().default(3000),
  APP_NAME: z.string().default('cadna-mart-backend'),
  API_PREFIX: z.string().default('api'),
  API_DEFAULT_VERSION: z.string().default('1'),

  MONGO_URI: z
    .string()
    .min(1)
    .refine((val) => val.startsWith('mongodb://') || val.startsWith('mongodb+srv://'), {
      message: 'MONGO_URI must start with mongodb:// or mongodb+srv://',
    }),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  SESSION_SECRET: z.string().min(32),
  SESSION_MAX_AGE: z.coerce.number().default(86400000),

  CORS_ORIGIN: z.string().default('*'),

  THROTTLE_TTL: z.coerce.number().default(60000),
  THROTTLE_LIMIT: z.coerce.number().default(100),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('debug'),
});

export type EnvConfig = z.infer<typeof envSchema>;
