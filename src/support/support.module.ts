import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { AdminSupportController, SupportWebhooksController } from './admin-support.controller';
import { SupportService } from './support.service';
import { SupportRepository } from './support.repository';
import { UploadModule } from '@upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [SupportController, AdminSupportController, SupportWebhooksController],
  providers: [SupportService, SupportRepository],
  exports: [SupportService],
})
export class SupportModule {}
