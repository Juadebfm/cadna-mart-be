import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DataRequest, DataRequestKind, DataRequestStatus } from './schemas/data-request.schema';

@Injectable()
export class DataRequestsService {
  constructor(@InjectModel(DataRequest.name) private readonly model: Model<DataRequest>) {}

  async create(userId: string, kind: DataRequestKind, notes?: string): Promise<DataRequest> {
    const existing = await this.model
      .findOne({
        userId: new Types.ObjectId(userId),
        kind,
        status: DataRequestStatus.PENDING,
      })
      .lean()
      .exec();
    if (existing) {
      return existing as unknown as DataRequest;
    }
    const created = await this.model.create({
      userId: new Types.ObjectId(userId),
      kind,
      notes: notes ?? null,
    });
    return created.toObject() as DataRequest;
  }
}
