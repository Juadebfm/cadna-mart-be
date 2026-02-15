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
} from './config.interface';

@Injectable()
export class ConfigService {
  private readonly envConfig: EnvConfig;
  private readonly logger = new Logger(ConfigService.name);

  constructor() {
    const nodeEnv = process.env.NODE_ENV || 'dev';
    const envFile = `.env.${nodeEnv}`;
    dotenvConfig({ path: resolve(process.cwd(), envFile) });

    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      this.logger.error(`Invalid environment variables in ${envFile}:`);
      const formatted = result.error.format();
      this.logger.error(JSON.stringify(formatted, null, 2));
      process.exit(1);
    }
    this.envConfig = result.data;
    this.logger.log(`Configuration loaded from ${envFile} (${nodeEnv})`);
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
      origin: this.envConfig.CORS_ORIGIN,
    };
  }

  get throttle(): ThrottleConfig {
    return {
      ttl: this.envConfig.THROTTLE_TTL,
      limit: this.envConfig.THROTTLE_LIMIT,
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
}
