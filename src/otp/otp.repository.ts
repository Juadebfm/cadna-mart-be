import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '@database/prisma.service';
import { createPublicId } from '@database/id.util';
import { OtpType } from './enums/otp-type.enum';

export type OtpRow = Prisma.OtpGetPayload<Record<string, never>>;

@Injectable()
export class OtpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<Prisma.OtpUncheckedCreateInput, 'id'>): Promise<OtpRow> {
    await this.prisma.otp.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return this.prisma.otp.create({ data: { ...data, id: createPublicId() } });
  }

  async findLatestValid(email: string, type: OtpType): Promise<OtpRow | null> {
    return this.prisma.otp.findFirst({
      where: { email: email.toLowerCase(), type, isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsUsed(id: string): Promise<void> {
    await this.prisma.otp.updateMany({ where: { id }, data: { isUsed: true } });
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.prisma.otp.update({ where: { id }, data: { attempts: { increment: 1 } } });
  }

  async invalidateAll(email: string, type: OtpType): Promise<void> {
    await this.prisma.otp.updateMany({
      where: { email: email.toLowerCase(), type, isUsed: false },
      data: { isUsed: true },
    });
  }

  async findLatestByEmail(email: string, type: OtpType): Promise<OtpRow | null> {
    return this.prisma.otp.findFirst({
      where: { email: email.toLowerCase(), type },
      orderBy: { createdAt: 'desc' },
    });
  }
}
