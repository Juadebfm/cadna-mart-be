import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReviewsRepository, ReviewSortOption } from './reviews.repository';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { Product } from '@products/schemas/product.schema';
import { Review } from './schemas/review.schema';
import { Order, OrderStatus } from '@orders/schemas/order.schema';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
  ) {}

  async createReview(productId: string, userId: string, userName: string, dto: CreateReviewDto) {
    const product = await this.productModel
      .findOne({ _id: productId, deletedAt: null, isActive: true })
      .select('_id')
      .lean()
      .exec();

    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.reviewsRepository.findByUserAndProduct(userId, productId);
    if (existing) throw new ConflictException('You have already reviewed this product');

    const isVerifiedPurchase = await this.orderModel.exists({
      userId,
      status: OrderStatus.DELIVERED,
      'items.productId': productId,
      deletedAt: null,
    });
    const review = await this.reviewsRepository.create({
      product: productId as any,
      user: userId as any,
      rating: dto.rating,
      title: dto.title ?? null,
      comment: dto.comment ?? null,
      reviewerName: userName,
      isVerifiedPurchase: !!isVerifiedPurchase,
      moderationStatus: 'approved',
      moderationReason: null,
      moderatedAt: null,
      moderatedBy: null,
      deletedAt: null,
    } as any);

    await this.syncProductRating(productId);

    return this.toDto(review);
  }

  async findPendingReviews(userId: string, page = 1, limit = 20) {
    const orders = await this.orderModel
      .find({ userId, status: OrderStatus.DELIVERED, deletedAt: null })
      .select('orderRef items timeline createdAt')
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    const candidates = new Map<
      string,
      {
        productId: string;
        name: string;
        thumbnailUrl: string | null;
        orderRef: string;
        deliveredAt: Date | null;
      }
    >();
    for (const order of orders) {
      const deliveredAt =
        [...(order.timeline ?? [])]
          .reverse()
          .find((entry) => entry.status === OrderStatus.DELIVERED)?.timestamp ?? null;
      for (const item of order.items ?? []) {
        if (!item.productId || candidates.has(item.productId)) continue;
        candidates.set(item.productId, {
          productId: item.productId,
          name: item.name,
          thumbnailUrl: item.thumbnailUrl,
          orderRef: order.orderRef,
          deliveredAt,
        });
      }
    }
    const candidateItems = Array.from(candidates.values());
    const reviewedIds = new Set(
      await this.reviewsRepository.findReviewedProductIds(
        userId,
        candidateItems.map((item) => item.productId),
      ),
    );
    const pending = candidateItems.filter((item) => !reviewedIds.has(item.productId));
    const totalItems = pending.length;
    const offset = (page - 1) * limit;
    return {
      items: pending.slice(offset, offset + limit),
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    };
  }

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
        helpfulCount: (r as any).helpfulCount ?? 0,
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

  async markHelpful(reviewId: string) {
    const review = await this.reviewsRepository.reviewModel
      .findOneAndUpdate(
        { _id: reviewId, deletedAt: null },
        { $inc: { helpfulCount: 1 } },
        { new: true },
      )
      .lean()
      .exec();

    if (!review) throw new NotFoundException('Review not found');

    return { helpfulCount: (review as any).helpfulCount };
  }

  async updateOwnReview(reviewId: string, userId: string, dto: UpdateReviewDto) {
    const review = await this.reviewsRepository.findById(reviewId);
    if (!review || review.deletedAt) {
      throw new NotFoundException('Review not found');
    }

    if ((review.user as any)?.toString() !== userId) {
      throw new ForbiddenException('You do not own this review');
    }

    const updated = await this.reviewsRepository.update(reviewId, {
      rating: dto.rating ?? review.rating,
      title: dto.title ?? review.title,
      comment: dto.comment ?? review.comment,
      moderationStatus: 'approved',
      moderationReason: null,
      moderatedAt: null,
      moderatedBy: null,
    } as any);
    if (!updated) {
      throw new NotFoundException('Review not found');
    }

    await this.syncProductRating((updated.product as any).toString());
    return this.toDto(updated);
  }

  async deleteOwnReview(reviewId: string, userId: string): Promise<void> {
    const review = await this.reviewsRepository.findById(reviewId);
    if (!review || review.deletedAt) {
      throw new NotFoundException('Review not found');
    }

    if ((review.user as any)?.toString() !== userId) {
      throw new ForbiddenException('You do not own this review');
    }

    await this.reviewsRepository.update(reviewId, {
      deletedAt: new Date(),
      moderationStatus: 'deleted',
      moderationReason: null,
      moderatedAt: null,
      moderatedBy: null,
    } as any);
    await this.syncProductRating((review.product as any).toString());
  }

  async moderateReview(reviewId: string, adminUserId: string, dto: ModerateReviewDto) {
    const review = await this.reviewsRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const isHidden = dto.action === 'hide';
    const updated = await this.reviewsRepository.update(reviewId, {
      deletedAt: isHidden ? new Date() : null,
      moderationStatus: isHidden ? 'hidden' : 'approved',
      moderationReason: dto.reason?.trim() ? dto.reason.trim() : null,
      moderatedAt: new Date(),
      moderatedBy: adminUserId as any,
    } as any);
    if (!updated) {
      throw new NotFoundException('Review not found');
    }

    await this.syncProductRating((updated.product as any).toString());
    return this.toDto(updated);
  }

  private async syncProductRating(productId: string): Promise<void> {
    const stats = await this.reviewsRepository.reviewModel.aggregate([
      { $match: { product: productId, deletedAt: null } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    const rating = stats.length > 0 ? Math.round(stats[0].avg * 10) / 10 : 0;
    const reviewCount = stats[0]?.count ?? 0;

    await this.productModel.updateOne({ _id: productId }, { $set: { rating, reviewCount } });
  }

  private toDto(review: Review) {
    const id = (review as unknown as { _id: { toString(): string } })._id.toString();
    return {
      id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      reviewerName: review.reviewerName,
      isVerifiedPurchase: review.isVerifiedPurchase,
      helpfulCount: review.helpfulCount ?? 0,
      moderationStatus: (review as any).moderationStatus ?? 'approved',
      moderationReason: (review as any).moderationReason ?? null,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      moderatedAt: (review as any).moderatedAt ?? null,
    };
  }
}
