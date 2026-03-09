import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@config/config.module';
import { ConfigService } from '@config/config.service';
import { LoggerModule } from '@logger/logger.module';
import { DatabaseModule } from '@database/database.module';
import { AuthModule } from '@auth/auth.module';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AccountTypesGuard } from '@auth/guards/account-types.guard';
import { UsersModule } from '@users/users.module';
import { HealthModule } from '@health/health.module';
import { SharedModule } from '@shared/shared.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CorrelationIdMiddleware } from '@common/middleware/correlation-id.middleware';
import { RequestLoggerMiddleware } from '@common/middleware/request-logger.middleware';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    ThrottlerModule.forRootAsync({
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.throttle.ttl,
          limit: configService.throttle.limit,
        },
      ],
      inject: [ConfigService],
    }),
    SharedModule,
    AuthModule,
    UsersModule,
    HealthModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AccountTypesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}
