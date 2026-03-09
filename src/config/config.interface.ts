export interface AppConfig {
  nodeEnv: string;
  port: number;
  name: string;
  apiPrefix: string;
  apiDefaultVersion: string;
}

export interface DatabaseConfig {
  uri: string;
}

export interface JwtConfig {
  accessSecret: string;
  accessExpiration: string;
  refreshSecret: string;
  refreshExpiration: string;
}

export interface SessionConfig {
  secret: string;
  maxAge: number;
}

export interface CorsConfig {
  origin: string | string[] | boolean;
}

export interface ThrottleConfig {
  ttl: number;
  limit: number;
}

export interface EmailConfig {
  resendApiKey: string;
  fromAddress: string;
}

export interface ClerkConfig {
  webhookSecret: string;
}
