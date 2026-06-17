import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LogisticsBooking, BookingStatus } from './schemas/logistics-booking.schema';
import { randomBytes } from 'crypto';

@Injectable()
export class LogisticsRepository {
  constructor(
    @InjectModel(LogisticsBooking.name) private readonly model: Model<LogisticsBooking>,
  ) {}

  private generateRef(): string {
    return 'LB-' + randomBytes(4).toString('hex').toUpperCase();
  }

  async create(data: Partial<LogisticsBooking>): Promise<LogisticsBooking> {
    const booking = { ...data, bookingRef: this.generateRef() };
    return this.model.create(booking);
  }

  async findById(id: string): Promise<LogisticsBooking | null> {
    return this.model
      .findOne({ _id: new Types.ObjectId(id), deletedAt: null })
      .lean()
      .exec() as Promise<LogisticsBooking | null>;
  }

  async findByRef(ref: string): Promise<LogisticsBooking | null> {
    return this.model
      .findOne({ bookingRef: ref, deletedAt: null })
      .lean()
      .exec() as Promise<LogisticsBooking | null>;
  }

  async findByOrderId(orderId: string): Promise<LogisticsBooking | null> {
    return this.model
      .findOne({ orderId: new Types.ObjectId(orderId), deletedAt: null })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as Promise<LogisticsBooking | null>;
  }

  async update(id: string, data: Partial<LogisticsBooking>): Promise<LogisticsBooking | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec() as Promise<LogisticsBooking | null>;
  }

  async pushTrackingEvent(id: string, event: LogisticsBooking['trackingEvents'][0]): Promise<void> {
    await this.model.findByIdAndUpdate(id, { $push: { trackingEvents: event } }).exec();
  }

  async pushPodArtifact(id: string, artifact: LogisticsBooking['podArtifacts'][0]): Promise<void> {
    await this.model.findByIdAndUpdate(id, { $push: { podArtifacts: artifact } }).exec();
  }

  async updateStatus(id: string, status: BookingStatus): Promise<void> {
    await this.model.findByIdAndUpdate(id, { status }).exec();
  }
}
