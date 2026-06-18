import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SupportTicket, TicketCategory, TicketStatus } from './schemas/support-ticket.schema';
import { SupportRepository } from './support.repository';
import { CreateTicketDto, AddMessageDto } from './dto/ticket.dto';

@Injectable()
export class SupportService {
  constructor(private readonly repo: SupportRepository) {}

  private toDto(t: SupportTicket): object {
    const id = (t as unknown as { _id: { toString(): string } })._id.toString();
    return {
      id,
      userId: t.userId,
      guestEmail: t.guestEmail,
      subject: t.subject,
      body: t.body,
      category: t.category,
      status: t.status,
      assignedTo: t.assignedTo,
      messages: t.messages,
      orderId: t.orderId,
      closedAt: t.closedAt,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  async create(dto: CreateTicketDto, userId?: string): Promise<object> {
    const ticket = await this.repo.create({
      userId: userId ? (new Types.ObjectId(userId) as unknown as SupportTicket['userId']) : null,
      guestEmail: dto.guestEmail ?? null,
      subject: dto.subject,
      body: dto.body,
      category: dto.category ?? TicketCategory.OTHER,
      orderId: dto.orderId ?? null,
      messages: [
        {
          authorId: userId ?? 'guest',
          authorRole: userId ? 'user' : 'guest',
          body: dto.body,
          sentAt: new Date(),
        },
      ],
    } as Partial<SupportTicket>);
    return this.toDto(ticket);
  }

  async findByUser(userId: string, page = 1, limit = 20): Promise<object> {
    const { items, totalItems } = await this.repo.findByUser(userId, page, limit);
    return {
      items: items.map((t) => this.toDto(t)),
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    };
  }

  async findById(id: string): Promise<object> {
    const t = await this.repo.findById(id);
    if (!t) throw new NotFoundException('Support ticket not found');
    return this.toDto(t);
  }

  async addMessage(
    id: string,
    dto: AddMessageDto,
    authorId: string,
    authorRole: string,
  ): Promise<object> {
    const t = await this.repo.findById(id);
    if (!t) throw new NotFoundException('Support ticket not found');
    await this.repo.pushMessage(id, { authorId, authorRole, body: dto.body, sentAt: new Date() });
    const updated = await this.repo.findById(id);
    if (!updated) throw new NotFoundException('Ticket not found after update');
    return this.toDto(updated);
  }

  async findAll(page = 1, limit = 20, status?: TicketStatus, assignedTo?: string): Promise<object> {
    const { items, totalItems } = await this.repo.findAll(page, limit, status, assignedTo);
    return {
      items: items.map((t) => this.toDto(t)),
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    };
  }

  async assign(id: string, agentId: string): Promise<object> {
    const t = await this.repo.findById(id);
    if (!t) throw new NotFoundException('Support ticket not found');
    const updated = await this.repo.update(id, {
      assignedTo: new Types.ObjectId(agentId) as unknown as SupportTicket['assignedTo'],
      status: TicketStatus.IN_PROGRESS,
    } as Partial<SupportTicket>);
    if (!updated) throw new NotFoundException('Ticket not found after update');
    return this.toDto(updated);
  }

  async escalate(id: string, note?: string): Promise<object> {
    const t = await this.repo.findById(id);
    if (!t) throw new NotFoundException('Support ticket not found');
    if (note) {
      await this.repo.pushMessage(id, {
        authorId: 'system',
        authorRole: 'system',
        body: `Escalated: ${note}`,
        sentAt: new Date(),
      });
    }
    const updated = await this.repo.update(id, {
      status: TicketStatus.ESCALATED,
    } as Partial<SupportTicket>);
    if (!updated) throw new NotFoundException('Ticket not found after update');
    return this.toDto(updated);
  }

  async close(id: string): Promise<object> {
    const t = await this.repo.findById(id);
    if (!t) throw new NotFoundException('Support ticket not found');
    const updated = await this.repo.update(id, {
      status: TicketStatus.CLOSED,
      closedAt: new Date(),
    } as Partial<SupportTicket>);
    if (!updated) throw new NotFoundException('Ticket not found after update');
    return this.toDto(updated);
  }
}
