import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '@shared/base/base.schema';
import { Types } from 'mongoose';

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

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  collection: 'support_tickets',
})
export class SupportTicket extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  userId!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  guestEmail!: string | null;

  @Prop({ required: true })
  subject!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ type: String, enum: TicketCategory, default: TicketCategory.OTHER })
  category!: TicketCategory;

  @Prop({ type: String, enum: TicketStatus, default: TicketStatus.OPEN, index: true })
  status!: TicketStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedTo!: Types.ObjectId | null;

  @Prop({ type: [Object], default: [] })
  messages!: TicketMessage[];

  @Prop({ type: String, default: null })
  orderId!: string | null;

  @Prop({ type: Date, default: null })
  closedAt!: Date | null;
}

export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);
SupportTicketSchema.index({ userId: 1, createdAt: -1 });
SupportTicketSchema.index({ status: 1, assignedTo: 1 });
