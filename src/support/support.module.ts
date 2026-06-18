import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SupportTicket, SupportTicketSchema } from './schemas/support-ticket.schema';
import { SupportController } from './support.controller';
import { AdminSupportController, SupportWebhooksController } from './admin-support.controller';
import { SupportService } from './support.service';
import { SupportRepository } from './support.repository';

@Module({
  imports: [MongooseModule.forFeature([{ name: SupportTicket.name, schema: SupportTicketSchema }])],
  controllers: [SupportController, AdminSupportController, SupportWebhooksController],
  providers: [SupportService, SupportRepository],
  exports: [SupportService],
})
export class SupportModule {}
