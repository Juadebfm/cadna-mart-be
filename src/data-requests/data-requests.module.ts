import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DataRequest, DataRequestSchema } from './schemas/data-request.schema';
import { DataRequestsService } from './data-requests.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: DataRequest.name, schema: DataRequestSchema }])],
  providers: [DataRequestsService],
  exports: [DataRequestsService],
})
export class DataRequestsModule {}
