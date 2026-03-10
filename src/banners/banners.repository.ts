import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner, BannerType } from './schemas/banner.schema';

@Injectable()
export class BannersRepository {
  constructor(@InjectModel(Banner.name) public readonly bannerModel: Model<Banner>) {}

  async findByType(type: BannerType): Promise<Banner[]> {
    const now = new Date();
    return this.bannerModel
      .find({
        type,
        isActive: true,
        deletedAt: null,
        $or: [
          { startAt: null },
          { startAt: { $lte: now }, $or: [{ endAt: null }, { endAt: { $gte: now } }] },
        ],
      })
      .sort({ order: 1 })
      .lean()
      .exec() as unknown as Promise<Banner[]>;
  }
}
