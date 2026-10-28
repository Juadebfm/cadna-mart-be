import { BaseSchema } from '@shared/base/base.schema';
export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  ESCALATED = 'escalated',
  CLOSED = 'closed',
}
export enum TicketCategory {
  ORDER = 'order',
  PAYMENT = 'payment',
  RETURNS = 'returns',
  ACCOUNT = 'account',
  PRODUCT = 'product',
  OTHER = 'other',
}
export interface TicketMessage {
  authorId: string;
  authorRole: string;
  body: string;
  sentAt: Date;
}
export interface TicketAttachment {
  url: string;
  publicId: string;
}
export class SupportTicket extends BaseSchema {
  userId!: string | null;
  guestEmail!: string | null;
  subject!: string;
  body!: string;
  category!: TicketCategory;
  status!: TicketStatus;
  assignedTo!: string | null;
  messages!: TicketMessage[];
  orderId!: string | null;
  attachments!: TicketAttachment[];
  closedAt!: Date | null;
}
