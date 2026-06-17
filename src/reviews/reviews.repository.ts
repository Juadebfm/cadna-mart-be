import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, SortOrder as MongoSortOrder } from 'mongoose';
import { Review } from './schemas/review.schema';

export type ReviewSortOption = 'most_recent' | 'highest_rating' | 'lowest_rating' | 'most_helpful';

@Injectable()
export class ReviewsRepository {
  constructor(@InjectModel(Review.name) public readonly reviewModel: Model<Review>) {}

  async create(data: Partial<Review>): Promise<Review> {
    const review = new this.reviewModel(data);
    return review.save() as unknown as Review;
  }

  async findByProduct(
    productId: string,
    sort: ReviewSortOption,
    page: number,
    limit: number,
  ): Promise<{ items: Review[]; totalItems: number }> {
    const filter = { product: productId, deletedAt: null };
    const sortOrder = this.buildSort(sort);
    const skip = (page - 1) * limit;

    const [items, totalItems] = await Promise.all([
      this.reviewModel.find(filter).sort(sortOrder).skip(skip).limit(limit).lean().exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);

    return { items: items as unknown as Review[], totalItems };
  }

  async findByUserAndProduct(userId: string, productId: string): Promise<Review | null> {
    return this.reviewModel
      .findOne({ user: userId, product: productId, deletedAt: null })
      .lean()
      .exec() as unknown as Promise<Review | null>;
  }

  async findById(id: string): Promise<Review | null> {
    return this.reviewModel.findById(id).lean().exec() as unknown as Promise<Review | null>;
  }

  async update(id: string, data: Partial<Review>): Promise<Review | null> {
    return this.reviewModel
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec() as unknown as Promise<Review | null>;
  }

  async getSummary(productId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    breakdown: Record<string, number>;
  }> {
    const objectId = new Types.ObjectId(productId);
    const [stats, breakdownAgg] = await Promise.all([
      this.reviewModel.aggregate([
        { $match: { product: objectId, deletedAt: null } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      this.reviewModel.aggregate([
        { $match: { product: objectId, deletedAt: null } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
      ]),
    ]);

    const breakdown: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    for (const b of breakdownAgg) {
      breakdown[String(b._id)] = b.count;
    }

    return {
      averageRating: stats[0]?.avg ? Math.round(stats[0].avg * 10) / 10 : 0,
      totalReviews: stats[0]?.count ?? 0,
      breakdown,
    };
  }

  private buildSort(sort: ReviewSortOption): Record<string, MongoSortOrder> {
    switch (sort) {
      case 'highest_rating':
        return { rating: -1, createdAt: -1 };
      case 'lowest_rating':
        return { rating: 1, createdAt: -1 };
      case 'most_helpful':
        return { helpfulCount: -1, createdAt: -1 };
      case 'most_recent':
      default:
        return { createdAt: -1 };
    }
  }
}
