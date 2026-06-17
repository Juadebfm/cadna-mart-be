import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { SupportTicket, TicketStatus } from './schemas/support-ticket.schema';

@Injectable()
export class SupportRepository {
  constructor(@InjectModel(SupportTicket.name) private readonly model: Model<SupportTicket>) {}

  async create(data: Partial<SupportTicket>): Promise<SupportTicket> {
    return this.model.create(data);
  }

  async findById(id: string): Promise<SupportTicket | null> {
    return this.model
      .findOne({ _id: new Types.ObjectId(id), deletedAt: null })
      .lean()
      .exec() as Promise<SupportTicket | null>;
  }

  async findByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: SupportTicket[]; totalItems: number }> {
    const filter: FilterQuery<SupportTicket> = {
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    };
    const [items, totalItems] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as Promise<SupportTicket[]>,
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }

  async findAll(
    page: number,
    limit: number,
    status?: TicketStatus,
    assignedTo?: string,
  ): Promise<{ items: SupportTicket[]; totalItems: number }> {
    const filter: FilterQuery<SupportTicket> = { deletedAt: null };
    if (status) filter['status'] = status;
    if (assignedTo) filter['assignedTo'] = new Types.ObjectId(assignedTo);
    const [items, totalItems] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as Promise<SupportTicket[]>,
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }

  async update(id: string, data: Partial<SupportTicket>): Promise<SupportTicket | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec() as Promise<SupportTicket | null>;
  }

  async pushMessage(id: string, message: SupportTicket['messages'][0]): Promise<void> {
    await this.model.findByIdAndUpdate(id, { $push: { messages: message } }).exec();
  }
}
