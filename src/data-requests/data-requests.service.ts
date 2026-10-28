import { Injectable } from '@nestjs/common';
import { DataRequest as PrismaDataRequest } from '../generated/prisma/client';
import { PrismaService } from '@database/prisma.service';
import { createPublicId } from '@database/id.util';
import { DataRequestKind, DataRequestStatus } from './schemas/data-request.schema';

export type DataRequestRecord = PrismaDataRequest & { _id: string };

@Injectable()
export class DataRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, kind: DataRequestKind, notes?: string): Promise<DataRequestRecord> {
    const existing = await this.prisma.dataRequest.findFirst({
      where: { userId, kind, status: DataRequestStatus.PENDING },
    });
    if (existing) return { ...existing, _id: existing.id };

    const created = await this.prisma.dataRequest.create({
      data: {
        id: createPublicId(),
        userId,
        kind,
        notes: notes ?? null,
      },
    });
    return { ...created, _id: created.id };
  }
}
