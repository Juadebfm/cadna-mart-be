import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { ReviewsRepository, ReviewSortOption } from './reviews.repository';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { Review } from './schemas/review.schema';
import { OrderStatus } from '@orders/schemas/order.schema';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createReview(productId: string, userId: string, userName: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.reviewsRepository.findByUserAndProduct(userId, productId);
    if (existing) throw new ConflictException('You have already reviewed this product');

    const deliveredOrders = await this.prisma.order.findMany({
      where: { userId, status: OrderStatus.DELIVERED, deletedAt: null },
      select: { items: true },
    });
    const isVerifiedPurchase = deliveredOrders.some((order) =>
      (Array.isArray(order.items) ? (order.items as any[]) : []).some(
        (item) => item.productId === productId,
      ),
    );
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
    const orders = await this.prisma.order.findMany({
      where: { userId, status: OrderStatus.DELIVERED, deletedAt: null },
      select: { orderRef: true, items: true, timeline: true, createdAt: true },
      orderBy: { updatedAt: 'desc' },
    });

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
      const timeline = Array.isArray(order.timeline) ? (order.timeline as any[]) : [];
      const orderItems = Array.isArray(order.items) ? (order.items as any[]) : [];
      const deliveredAt =
        [...timeline].reverse().find((entry) => entry.status === OrderStatus.DELIVERED)
          ?.timestamp ?? null;
      for (const item of orderItems) {
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
    const review = await this.reviewsRepository.incrementHelpful(reviewId);

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
    const stats = await this.reviewsRepository.getSummary(productId);
    await this.prisma.product.updateMany({
      where: { id: productId },
      data: { rating: stats.averageRating, reviewCount: stats.totalReviews },
    });
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
