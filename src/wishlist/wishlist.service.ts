import { Injectable, NotFoundException } from '@nestjs/common';
import { WishlistRepository } from './wishlist.repository';
import { ProductsService } from '@products/products.service';

@Injectable()
export class WishlistService {
  constructor(
    private readonly wishlistRepository: WishlistRepository,
    private readonly productsService: ProductsService,
  ) {}

  async getWishlist(userId: string) {
    const items = await this.wishlistRepository.findByUser(userId);
    return {
      items: items.map((item) => ({
        productId: (item.product as unknown as { _id: { toString(): string } })._id.toString(),
        addedAt: item.createdAt,
        product: this.productsService.toCard(item.product as never),
      })),
    };
  }

  async addToWishlist(userId: string, productId: string) {
    await this.wishlistRepository.add(userId, productId);
    return { message: 'Added to wishlist' };
  }

  async removeFromWishlist(userId: string, productId: string) {
    const removed = await this.wishlistRepository.remove(userId, productId);
    if (!removed) throw new NotFoundException('Wishlist item not found');
    return { message: 'Removed from wishlist' };
  }
}
