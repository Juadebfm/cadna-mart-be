import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReturnRequest, ReturnRequestSchema } from './schemas/return-request.schema';
import { ReturnsController } from './returns.controller';
import { RefundsController } from './refunds.controller';
import { ReturnsService } from './returns.service';
import { ReturnsRepository } from './returns.repository';
import { OrdersModule } from '@orders/orders.module';
import { PaymentsModule } from '@payments/payments.module';
import { UploadModule } from '@upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ReturnRequest.name, schema: ReturnRequestSchema }]),
    OrdersModule,
    PaymentsModule,
    UploadModule,
  ],
  controllers: [ReturnsController, RefundsController],
  providers: [ReturnsService, ReturnsRepository],
  exports: [ReturnsService, ReturnsRepository],
})
export class ReturnsModule {}
