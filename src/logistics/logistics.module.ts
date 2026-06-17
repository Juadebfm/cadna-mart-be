import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogisticsBooking, LogisticsBookingSchema } from './schemas/logistics-booking.schema';
import { LogisticsController } from './logistics.controller';
import { LogisticsWebhooksController } from './logistics-webhooks.controller';
import { LogisticsService } from './logistics.service';
import { LogisticsRepository } from './logistics.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: LogisticsBooking.name, schema: LogisticsBookingSchema }]),
  ],
  controllers: [LogisticsController, LogisticsWebhooksController],
  providers: [LogisticsService, LogisticsRepository],
  exports: [LogisticsService, LogisticsRepository],
})
export class LogisticsModule {}
