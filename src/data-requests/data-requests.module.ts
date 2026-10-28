import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma.module';
import { DataRequestsService } from './data-requests.service';

@Module({
  imports: [PrismaModule],
  providers: [DataRequestsService],
  exports: [DataRequestsService],
})
export class DataRequestsModule {}
