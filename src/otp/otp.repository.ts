import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Otp } from './schemas/otp.schema';
import { OtpType } from './enums/otp-type.enum';

@Injectable()
export class OtpRepository {
  constructor(@InjectModel(Otp.name) private readonly otpModel: Model<Otp>) {}

  async create(data: Partial<Otp>): Promise<Otp> {
    return this.otpModel.create(data);
  }

  async findLatestValid(email: string, type: OtpType): Promise<Otp | null> {
    return this.otpModel
      .findOne({
        email: email.toLowerCase(),
        type,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async markAsUsed(id: string): Promise<void> {
    await this.otpModel.updateOne({ _id: id }, { isUsed: true }).exec();
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.otpModel.updateOne({ _id: id }, { $inc: { attempts: 1 } }).exec();
  }

  async invalidateAll(email: string, type: OtpType): Promise<void> {
    await this.otpModel
      .updateMany({ email: email.toLowerCase(), type, isUsed: false }, { isUsed: true })
      .exec();
  }

  async findLatestByEmail(email: string, type: OtpType): Promise<Otp | null> {
    return this.otpModel
      .findOne({ email: email.toLowerCase(), type })
      .sort({ createdAt: -1 })
      .exec();
  }
}
