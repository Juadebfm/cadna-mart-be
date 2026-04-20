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

  RESEND_API_KEY: z.string().min(1).default('re_placeholder'),
  EMAIL_FROM: z.string().default('Cadna Mart <noreply@cadnamart.com>'),

  CLERK_WEBHOOK_SECRET: z.string().default(''),
  CLERK_SECRET_KEY: z.string().default(''),

  PAYSTACK_SECRET_KEY: z.string().default(''),
  PAYSTACK_WEBHOOK_SECRET: z.string().default(''),
  PAYSTACK_CALLBACK_URL: z.string().default(''),

  DEALS_FEE_PER_PRODUCT: z.coerce.number().default(5000),
  DEALS_MAX_PRODUCTS: z.coerce.number().default(10),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('debug'),

  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
});

export type EnvConfig = z.infer<typeof envSchema>;
