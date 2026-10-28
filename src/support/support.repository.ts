import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { createPublicId } from '@database/id.util';
import { SupportTicket, TicketStatus } from './schemas/support-ticket.schema';

@Injectable()
export class SupportRepository {
  constructor(private readonly prisma: PrismaService) {}
  private legacy(row: any): SupportTicket | null {
    return row
      ? ({ ...row, _id: row.id, assignedTo: row.assignedToId } as unknown as SupportTicket)
      : null;
  }
  private json(value: unknown) {
    return value as any;
  }

  async create(data: Partial<SupportTicket>): Promise<SupportTicket> {
    const value = data as any;
    const row = await this.prisma.supportTicket.create({
      data: {
        id: createPublicId(),
        userId: value.userId ?? null,
        guestEmail: value.guestEmail ?? null,
        subject: value.subject,
        body: value.body,
        category: value.category ?? 'other',
        status: value.status ?? 'open',
        assignedToId: value.assignedTo ?? null,
        messages: this.json(value.messages ?? []),
        orderId: value.orderId ?? null,
        attachments: this.json(value.attachments ?? []),
        closedAt: value.closedAt ?? null,
      },
    });
    return this.legacy(row)!;
  }

  async findById(id: string): Promise<SupportTicket | null> {
    return this.legacy(await this.prisma.supportTicket.findUnique({ where: { id } }));
  }
  async findByUserAndId(userId: string, id: string): Promise<SupportTicket | null> {
    return this.legacy(await this.prisma.supportTicket.findFirst({ where: { id, userId } }));
  }

  async findByUser(userId: string, page: number, limit: number) {
    const where = { userId };
    const [rows, totalItems] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { items: rows.map((row) => this.legacy(row)!), totalItems };
  }

  async findAll(page: number, limit: number, status?: TicketStatus, assignedTo?: string) {
    const where = {
      ...(status ? { status } : {}),
      ...(assignedTo ? { assignedToId: assignedTo } : {}),
    };
    const [rows, totalItems] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { items: rows.map((row) => this.legacy(row)!), totalItems };
  }

  async update(id: string, data: Partial<SupportTicket>): Promise<SupportTicket | null> {
    const value: any = { ...(data as any) };
    if ('assignedTo' in value) {
      value.assignedToId = value.assignedTo;
      delete value.assignedTo;
    }
    if ('messages' in value) value.messages = this.json(value.messages);
    if ('attachments' in value) value.attachments = this.json(value.attachments);
    try {
      return this.legacy(await this.prisma.supportTicket.update({ where: { id }, data: value }));
    } catch {
      return null;
    }
  }

  async updateForUser(
    userId: string,
    id: string,
    data: Partial<SupportTicket>,
  ): Promise<SupportTicket | null> {
    const current = await this.prisma.supportTicket.findFirst({ where: { id, userId } });
    return current ? this.update(id, data) : null;
  }

  async pushMessageForUser(
    userId: string,
    id: string,
    message: SupportTicket['messages'][0],
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.supportTicket.findFirst({ where: { id, userId } });
      if (!current) return false;
      const messages = [
        ...(Array.isArray(current.messages) ? (current.messages as any[]) : []),
        message,
      ];
      await tx.supportTicket.update({ where: { id }, data: { messages: this.json(messages) } });
      return true;
    });
  }

  async pushMessage(id: string, message: SupportTicket['messages'][0]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM support_tickets WHERE id = ${id} FOR UPDATE`;
      const current = await tx.supportTicket.findUnique({ where: { id } });
      if (!current) return;
      const messages = [
        ...(Array.isArray(current.messages) ? (current.messages as any[]) : []),
        message,
      ];
      await tx.supportTicket.update({ where: { id }, data: { messages: this.json(messages) } });
    });
  }
}
