import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RegistrationSession } from './schemas/registration-session.schema';

@Injectable()
export class RegistrationSessionRepository {
  constructor(
    @InjectModel(RegistrationSession.name)
    private readonly model: Model<RegistrationSession>,
  ) {}

  async create(data: Partial<RegistrationSession>): Promise<RegistrationSession> {
    return this.model.create(data);
  }

  async findBySessionId(sessionId: string): Promise<RegistrationSession | null> {
    return this.model
      .findOne({ sessionId, expiresAt: { $gt: new Date() } })
      .exec();
  }

  async update(sessionId: string, data: Partial<RegistrationSession>): Promise<RegistrationSession | null> {
    return this.model
      .findOneAndUpdate({ sessionId }, data, { new: true })
      .exec();
  }

  async delete(sessionId: string): Promise<void> {
    await this.model.deleteOne({ sessionId }).exec();
  }
}
