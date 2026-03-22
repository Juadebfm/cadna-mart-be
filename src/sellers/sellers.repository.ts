import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Seller } from './schemas/seller.schema';
import { SellerFollower } from './schemas/seller-follower.schema';

@Injectable()
export class SellersRepository {
  constructor(
    @InjectModel(Seller.name) public readonly sellerModel: Model<Seller>,
    @InjectModel(SellerFollower.name) public readonly followerModel: Model<SellerFollower>,
  ) {}

  async findById(id: string): Promise<Seller | null> {
    return this.sellerModel
      .findOne({ _id: id, deletedAt: null })
      .lean()
      .exec() as unknown as Promise<Seller | null>;
  }

  async findBySlug(slug: string): Promise<Seller | null> {
    return this.sellerModel
      .findOne({ slug, deletedAt: null })
      .lean()
      .exec() as unknown as Promise<Seller | null>;
  }

  async findByOwner(ownerId: string): Promise<Seller | null> {
    return this.sellerModel
      .findOne({ owner: ownerId, deletedAt: null })
      .lean()
      .exec() as unknown as Promise<Seller | null>;
  }

  async create(data: Partial<Seller>): Promise<Seller> {
    const seller = new this.sellerModel(data);
    return seller.save();
  }

  async update(id: string, data: Partial<Seller>): Promise<Seller | null> {
    return this.sellerModel
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec() as unknown as Promise<Seller | null>;
  }

  async follow(userId: string, sellerId: string): Promise<void> {
    await this.followerModel.create({ user: userId, seller: sellerId });
    await this.sellerModel.updateOne({ _id: sellerId }, { $inc: { followerCount: 1 } });
  }

  async unfollow(userId: string, sellerId: string): Promise<boolean> {
    const result = await this.followerModel.deleteOne({ user: userId, seller: sellerId });
    if (result.deletedCount > 0) {
      await this.sellerModel.updateOne({ _id: sellerId }, { $inc: { followerCount: -1 } });
      return true;
    }
    return false;
  }

  async isFollowing(userId: string, sellerId: string): Promise<boolean> {
    const doc = await this.followerModel.findOne({ user: userId, seller: sellerId }).lean().exec();
    return !!doc;
  }
}
