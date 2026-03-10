import { Injectable } from '@nestjs/common';
import { ReviewsRepository, ReviewSortOption } from './reviews.repository';

@Injectable()
export class ReviewsService {
  constructor(private readonly reviewsRepository: ReviewsRepository) {}

  async findByProduct(productId: string, sort: ReviewSortOption, page: number, limit: number) {
    const [{ items, totalItems }, summary] = await Promise.all([
      this.reviewsRepository.findByProduct(productId, sort, page, limit),
      this.reviewsRepository.getSummary(productId),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      summary,
      items: items.map((r) => ({
        id: (r as unknown as { _id: { toString(): string } })._id.toString(),
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        reviewerName: r.reviewerName,
        createdAt: r.createdAt,
        isVerifiedPurchase: r.isVerifiedPurchase,
      })),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
