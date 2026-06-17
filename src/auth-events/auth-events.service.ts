import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthEvent, AuthEventKind } from './schemas/auth-event.schema';

@Injectable()
export class AuthEventsService {
  constructor(@InjectModel(AuthEvent.name) private readonly model: Model<AuthEvent>) {}

  async log(
    userId: string | null,
    kind: AuthEventKind,
    options: { succeeded?: boolean; ip?: string | null; userAgent?: string | null } = {},
  ): Promise<void> {
    try {
      await this.model.create({
        userId: userId ? new Types.ObjectId(userId) : null,
        kind,
        succeeded: options.succeeded ?? true,
        ip: options.ip ?? null,
        userAgent: options.userAgent ?? null,
      });
    } catch {
      // Audit logging must never break an auth flow.
    }
  }

  async listForUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    items: AuthEvent[];
    pagination: { page: number; limit: number; totalItems: number; totalPages: number };
  }> {
    const cap = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const p = Math.max(Number(page) || 1, 1);
    const filter = { userId: new Types.ObjectId(userId) };
    const [items, totalItems] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * cap)
        .limit(cap)
        .lean()
        .exec(),
      this.model.countDocuments(filter),
    ]);

    return {
      items: items as unknown as AuthEvent[],
      pagination: {
        page: p,
        limit: cap,
        totalItems,
        totalPages: Math.ceil(totalItems / cap),
      },
    };
  }
}
