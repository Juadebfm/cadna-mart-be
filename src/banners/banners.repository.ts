import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Banner, BannerType } from './schemas/banner.schema';

@Injectable()
export class BannersRepository {
  constructor(@InjectModel(Banner.name) public readonly bannerModel: Model<Banner>) {}

  async findByType(type: BannerType, location?: string): Promise<Banner[]> {
    const normalizedLocation = location?.trim().toLowerCase();
    const baseFilter = this.buildActiveFilter(type);

    if (!normalizedLocation) {
      return this.findMany(baseFilter);
    }

    const [targeted, global] = await Promise.all([
      this.findMany({
        $and: [baseFilter, { locations: normalizedLocation }],
      }),
      this.findMany({
        $and: [
          baseFilter,
          {
            $or: [{ locations: { $exists: false } }, { locations: { $size: 0 } }],
          },
        ],
      }),
    ]);

    if (targeted.length === 0) {
      return global;
    }

    const seen = new Set(
      targeted.map((banner) => (banner as unknown as { _id: { toString(): string } })._id.toString()),
    );

    return [
      ...targeted,
      ...global.filter((banner) => {
        const bannerId = (banner as unknown as { _id: { toString(): string } })._id.toString();
        return !seen.has(bannerId);
      }),
    ];
  }

  private buildActiveFilter(type: BannerType): FilterQuery<Banner> {
    const now = new Date();

    return {
      type,
      isActive: true,
      deletedAt: null,
      $or: [
        { startAt: null },
        { startAt: { $lte: now }, $or: [{ endAt: null }, { endAt: { $gte: now } }] },
      ],
    };
  }

  private findMany(filter: FilterQuery<Banner>): Promise<Banner[]> {
    return this.bannerModel.find(filter).sort({ order: 1 }).lean().exec() as unknown as Promise<Banner[]>;
  }
}
