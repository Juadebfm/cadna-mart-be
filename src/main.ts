import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
/* eslint-disable @typescript-eslint/no-require-imports */
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const helmet = require('helmet');
import { AppModule } from './app.module';
import { ConfigService } from '@config/config.service';
import { LoggerService } from '@logger/logger.service';
import { AllExceptionsFilter } from '@common/filters/all-exceptions.filter';
import { ResponseTransformInterceptor } from '@common/interceptors/response-transform.interceptor';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from '@common/interceptors/timeout.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const loggerService = app.get(LoggerService);
  app.useLogger(loggerService);

  // Global prefix and versioning
  app.setGlobalPrefix(configService.app.apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: configService.app.apiDefaultVersion,
  });

  // Security
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({
    origin: configService.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
  });

  // Session (dual-layer auth)
  app.use(
    session({
      secret: configService.session.secret,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: configService.database.uri,
        collectionName: 'sessions',
      }),
      cookie: {
        maxAge: configService.session.maxAge,
        httpOnly: true,
        secure: configService.isProd,
        sameSite: configService.isProd ? 'strict' : 'lax',
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters and interceptors
  app.useGlobalFilters(new AllExceptionsFilter(loggerService));
  app.useGlobalInterceptors(
    new ResponseTransformInterceptor(),
    new LoggingInterceptor(loggerService),
    new TimeoutInterceptor(),
  );

  // Swagger
  if (!configService.isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Cadna Mart API')
      .setDescription('Enterprise e-commerce backend API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${configService.app.apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = configService.app.port;
  await app.listen(port, '0.0.0.0');
  loggerService.log(
    `Application running on http://localhost:${port}/${configService.app.apiPrefix}/v${configService.app.apiDefaultVersion}`,
    'Bootstrap',
  );
  loggerService.log(
    `Swagger docs available at http://localhost:${port}/${configService.app.apiPrefix}/docs`,
    'Bootstrap',
  );
}

void bootstrap().catch((error) => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});
