import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from './schemas/cart.schema';

@Injectable()
export class CartRepository {
  constructor(@InjectModel(Cart.name) public readonly cartModel: Model<Cart>) {}

  async findByUser(userId: string): Promise<Cart | null> {
    return this.cartModel
      .findOne({ user: userId })
      .populate('items.product', 'name slug thumbnailUrl price variants inventoryStatus')
      .lean()
      .exec() as unknown as Promise<Cart | null>;
  }

  async findOrCreate(userId: string): Promise<Cart> {
    let cart = await this.cartModel.findOne({ user: userId }).exec();
    if (!cart) {
      cart = new this.cartModel({ user: userId, items: [] });
      await cart.save();
    }
    return cart;
  }

  async addItem(
    userId: string,
    productId: string,
    variantId: string | null,
    quantity: number,
  ): Promise<Cart> {
    const cart = await this.findOrCreate(userId);

    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId && item.variantId === variantId,
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: productId, variantId, quantity } as never);
    }

    await cart.save();
    return this.cartModel
      .findById(cart._id)
      .populate('items.product', 'name slug thumbnailUrl price variants inventoryStatus')
      .lean()
      .exec() as unknown as Promise<Cart>;
  }

  async updateItemQuantity(userId: string, itemId: string, quantity: number): Promise<Cart | null> {
    await this.cartModel.updateOne(
      { user: userId, 'items._id': itemId },
      { $set: { 'items.$.quantity': quantity } },
    );
    return this.findByUser(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<Cart | null> {
    await this.cartModel.updateOne({ user: userId }, { $pull: { items: { _id: itemId } } });
    return this.findByUser(userId);
  }
}
