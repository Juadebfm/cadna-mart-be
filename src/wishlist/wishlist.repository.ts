import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WishlistItem } from './schemas/wishlist.schema';

@Injectable()
export class WishlistRepository {
  constructor(@InjectModel(WishlistItem.name) public readonly wishlistModel: Model<WishlistItem>) {}

  async findByUser(userId: string): Promise<WishlistItem[]> {
    return this.wishlistModel
      .find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('product')
      .lean()
      .exec() as unknown as Promise<WishlistItem[]>;
  }

  async add(userId: string, productId: string): Promise<WishlistItem> {
    const existing = await this.wishlistModel.findOne({ user: userId, product: productId });
    if (existing) return existing;

    const item = new this.wishlistModel({ user: userId, product: productId });
    return item.save();
  }

  async remove(userId: string, productId: string): Promise<boolean> {
    const result = await this.wishlistModel.deleteOne({ user: userId, product: productId });
    return result.deletedCount > 0;
  }
}
