import { Injectable, Logger } from '@nestjs/common';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { envSchema, EnvConfig } from './config.schema';
import {
  AppConfig,
  DatabaseConfig,
  JwtConfig,
  SessionConfig,
  CorsConfig,
  ThrottleConfig,
  EmailConfig,
  ClerkConfig,
  StorageConfig,
} from './config.interface';

@Injectable()
export class ConfigService {
  private readonly envConfig: EnvConfig;
  private readonly logger = new Logger(ConfigService.name);

  private normalizeNodeEnv(value: string | undefined): 'dev' | 'staging' | 'prod' {
    const normalized = (value ?? '').trim().toLowerCase();
    if (normalized === 'production' || normalized === 'prod') {
      return 'prod';
    }
    if (normalized === 'staging') {
      return 'staging';
    }
    if (normalized === 'development' || normalized === 'dev') {
      return 'dev';
    }
    return 'dev';
  }

  constructor() {
    const originalNodeEnv = process.env.NODE_ENV;
    const nodeEnv = this.normalizeNodeEnv(originalNodeEnv);
    process.env.NODE_ENV = nodeEnv;

    const envFile = `.env.${nodeEnv}`;
    const baseEnvFile = '.env';

    // Load env-specific file first; then fill missing values from base .env.
    dotenvConfig({ path: resolve(process.cwd(), envFile), override: false });
    dotenvConfig({ path: resolve(process.cwd(), baseEnvFile), override: false });

    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const formatted = result.error.format();
      const errorDetails = JSON.stringify(formatted, null, 2);
      const summary =
        `Invalid environment variables for NODE_ENV="${originalNodeEnv ?? 'undefined'}"` +
        ` (normalized to "${nodeEnv}") using ${envFile} + ${baseEnvFile}.`;

      // Keep console output so startup failures are visible even before custom logger init.

      console.error(summary);

      console.error(errorDetails);
      this.logger.error(summary);
      this.logger.error(errorDetails);
      process.exit(1);
    }

    this.envConfig = result.data;
    this.logger.log(`Configuration loaded from ${envFile} + ${baseEnvFile} (${nodeEnv})`);
  }

  private parseCorsOrigin(value: string): string | string[] | boolean {
    const raw = (value ?? '').trim();
    if (!raw) {
      return true;
    }
    if (raw === '*') {
      this.logger.warn(
        'CORS_ORIGIN is "*" which allows any origin with credentials; prefer explicit origins.',
      );
      return true;
    }

    const origins = raw
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);

    if (origins.length === 0) {
      return true;
    }

    return origins.length === 1 ? origins[0] : origins;
  }

  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.envConfig[key];
  }

  get app(): AppConfig {
    return {
      nodeEnv: this.envConfig.NODE_ENV,
      port: this.envConfig.PORT || this.envConfig.APP_PORT,
      name: this.envConfig.APP_NAME,
      apiPrefix: this.envConfig.API_PREFIX,
      apiDefaultVersion: this.envConfig.API_DEFAULT_VERSION,
    };
  }

  get database(): DatabaseConfig {
    return {
      uri: this.envConfig.MONGO_URI,
    };
  }

  get jwt(): JwtConfig {
    return {
      accessSecret: this.envConfig.JWT_ACCESS_SECRET,
      accessExpiration: this.envConfig.JWT_ACCESS_EXPIRATION,
      refreshSecret: this.envConfig.JWT_REFRESH_SECRET,
      refreshExpiration: this.envConfig.JWT_REFRESH_EXPIRATION,
    };
  }

  get session(): SessionConfig {
    return {
      secret: this.envConfig.SESSION_SECRET,
      maxAge: this.envConfig.SESSION_MAX_AGE,
    };
  }

  get cors(): CorsConfig {
    return {
      origin: this.parseCorsOrigin(this.envConfig.CORS_ORIGIN),
    };
  }

  get throttle(): ThrottleConfig {
    return {
      ttl: this.envConfig.THROTTLE_TTL,
      limit: this.envConfig.THROTTLE_LIMIT,
    };
  }

  get clerk(): ClerkConfig {
    return {
      webhookSecret: this.envConfig.CLERK_WEBHOOK_SECRET,
    };
  }

  get email(): EmailConfig {
    return {
      resendApiKey: this.envConfig.RESEND_API_KEY,
      fromAddress: this.envConfig.EMAIL_FROM,
    };
  }

  get logLevel(): string {
    return this.envConfig.LOG_LEVEL;
  }

  get isDev(): boolean {
    return this.envConfig.NODE_ENV === 'dev';
  }

  get isStaging(): boolean {
    return this.envConfig.NODE_ENV === 'staging';
  }

  get isProd(): boolean {
    return this.envConfig.NODE_ENV === 'prod';
  }

  get storage(): StorageConfig {
    return {
      cloudName: this.envConfig.CLOUDINARY_CLOUD_NAME,
      apiKey: this.envConfig.CLOUDINARY_API_KEY,
      apiSecret: this.envConfig.CLOUDINARY_API_SECRET,
    };
  }
}
