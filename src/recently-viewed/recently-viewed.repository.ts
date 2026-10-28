import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RecentlyViewed } from './schemas/recently-viewed.schema';

const MAX_RECENT_PRODUCTS = 100;

@Injectable()
export class RecentlyViewedRepository {
  constructor(@InjectModel(RecentlyViewed.name) private readonly model: Model<RecentlyViewed>) {}

  async record(userId: string, productId: string): Promise<void> {
    await this.model
      .updateOne(
        { user: new Types.ObjectId(userId), product: new Types.ObjectId(productId) },
        {
          $set: { viewedAt: new Date(), deletedAt: null },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      )
      .exec();

    const stale = await this.model
      .find({ user: new Types.ObjectId(userId), deletedAt: null })
      .sort({ viewedAt: -1 })
      .skip(MAX_RECENT_PRODUCTS)
      .select('_id')
      .lean()
      .exec();
    if (stale.length) {
      await this.model.deleteMany({ _id: { $in: stale.map((entry) => entry._id) } }).exec();
    }
  }

  async findByUser(userId: string, page: number, limit: number) {
    const filter = { user: new Types.ObjectId(userId), deletedAt: null };
    const [items, totalItems] = await Promise.all([
      this.model
        .find(filter)
        .populate({ path: 'product', match: { deletedAt: null, isActive: true } })
        .sort({ viewedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items: items as unknown as RecentlyViewed[], totalItems };
  }
}
