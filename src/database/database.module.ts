import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@config/config.service';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.database.uri,
        autoIndex: !configService.isProd,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 20000,
        connectionFactory: (connection) => {
          connection.on('connected', () => {
            console.log('MongoDB connected');
          });
          connection.on('error', (error) => {
            console.error('MongoDB connection error:', error?.message ?? error);
          });
          connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
          });
          return connection;
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
