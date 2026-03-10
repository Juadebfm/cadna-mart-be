import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder as MongoSortOrder } from 'mongoose';
import { Review } from './schemas/review.schema';

export type ReviewSortOption = 'most_recent' | 'highest_rating' | 'lowest_rating' | 'most_helpful';

@Injectable()
export class ReviewsRepository {
  constructor(@InjectModel(Review.name) public readonly reviewModel: Model<Review>) {}

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

  async getSummary(productId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    breakdown: Record<string, number>;
  }> {
    const [stats, breakdownAgg] = await Promise.all([
      this.reviewModel.aggregate([
        { $match: { product: productId, deletedAt: null } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      this.reviewModel.aggregate([
        { $match: { product: productId, deletedAt: null } },
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
        return { createdAt: -1 };
      case 'most_recent':
      default:
        return { createdAt: -1 };
    }
  }
}
