import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@config/config.service';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.database.uri,
        autoIndex: !configService.isProd,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
