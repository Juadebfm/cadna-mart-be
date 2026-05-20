import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { Cart, CartOwnerType } from './schemas/cart.schema';

const GUEST_CART_TTL_DAYS = 30;

@Injectable()
export class CartRepository {
  constructor(@InjectModel(Cart.name) public readonly cartModel: Model<Cart>) {}

  // ─── Lookup ────────────────────────────────────────────────

  async findByUser(userId: string): Promise<Cart | null> {
    return this.cartModel
      .findOne({ user: userId })
      .populate('items.product', 'name slug thumbnailUrl price variants inventoryStatus isActive')
      .lean()
      .exec() as unknown as Promise<Cart | null>;
  }

  async findByPublicId(publicCartId: string): Promise<Cart | null> {
    return this.cartModel
      .findOne({ publicCartId })
      .populate('items.product', 'name slug thumbnailUrl price variants inventoryStatus isActive')
      .lean()
      .exec() as unknown as Promise<Cart | null>;
  }

  async findByPublicIdWithGuestHash(publicCartId: string): Promise<Cart | null> {
    return this.cartModel
      .findOne({ publicCartId })
      .select('+guestTokenHash')
      .exec() as unknown as Promise<Cart | null>;
  }

  // ─── Creation ──────────────────────────────────────────────

  async findOrCreateForUser(userId: string): Promise<Cart> {
    let cart = await this.cartModel.findOne({ user: userId }).exec();
    if (!cart) {
      cart = new this.cartModel({
        user: userId,
        ownerType: CartOwnerType.USER,
        publicCartId: randomUUID(),
        items: [],
      });
      await cart.save();
    } else if (!cart.publicCartId) {
      cart.publicCartId = randomUUID();
      cart.ownerType = CartOwnerType.USER;
      await cart.save();
    }
    return cart;
  }

  async createGuest(guestTokenHash: string): Promise<Cart> {
    const expiresAt = new Date(Date.now() + GUEST_CART_TTL_DAYS * 24 * 60 * 60 * 1000);
    const cart = new this.cartModel({
      user: null,
      ownerType: CartOwnerType.GUEST,
      publicCartId: randomUUID(),
      guestTokenHash,
      expiresAt,
      items: [],
    });
    await cart.save();
    return cart;
  }

  // ─── Mutations by cartId ───────────────────────────────────

  async addItemByCartId(
    cartId: string,
    productId: string,
    variantId: string | null,
    quantity: number,
  ): Promise<Cart | null> {
    const cart = await this.cartModel.findOne({ publicCartId: cartId }).exec();
    if (!cart) return null;

    const existing = cart.items.find(
      (item) => item.product.toString() === productId && item.variantId === variantId,
    );
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.items.push({ product: productId, variantId, quantity } as never);
    }
    await cart.save();
    return this.findByPublicId(cartId);
  }

  async updateItemQuantityByCartId(
    cartId: string,
    itemId: string,
    quantity: number,
  ): Promise<Cart | null> {
    const result = await this.cartModel.updateOne(
      { publicCartId: cartId, 'items._id': itemId },
      { $set: { 'items.$.quantity': quantity } },
    );
    if (result.matchedCount === 0) return null;
    return this.findByPublicId(cartId);
  }

  async removeItemByCartId(cartId: string, itemId: string): Promise<Cart | null> {
    const result = await this.cartModel.updateOne(
      { publicCartId: cartId },
      { $pull: { items: { _id: itemId } } },
    );
    if (result.matchedCount === 0) return null;
    return this.findByPublicId(cartId);
  }

  async clearItemsByCartId(cartId: string): Promise<Cart | null> {
    const result = await this.cartModel.updateOne(
      { publicCartId: cartId },
      { $set: { items: [] } },
    );
    if (result.matchedCount === 0) return null;
    return this.findByPublicId(cartId);
  }

  async deleteByPublicId(publicCartId: string): Promise<void> {
    await this.cartModel.deleteOne({ publicCartId }).exec();
  }

  // ─── Legacy user-scoped mutations (kept for back-compat) ──

  async addItem(
    userId: string,
    productId: string,
    variantId: string | null,
    quantity: number,
  ): Promise<Cart> {
    const cart = await this.findOrCreateForUser(userId);
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
      .populate('items.product', 'name slug thumbnailUrl price variants inventoryStatus isActive')
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

  // ─── Merge ─────────────────────────────────────────────────

  async claimGuestForUser(guestPublicId: string, userId: string): Promise<Cart | null> {
    const userCart = await this.findOrCreateForUser(userId);
    const guestCart = await this.cartModel.findOne({ publicCartId: guestPublicId }).exec();
    if (!guestCart || guestCart.ownerType !== CartOwnerType.GUEST) return null;

    for (const item of guestCart.items) {
      const existing = userCart.items.find(
        (i) => i.product.toString() === item.product.toString() && i.variantId === item.variantId,
      );
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        userCart.items.push({
          product: item.product,
          variantId: item.variantId,
          quantity: item.quantity,
        } as never);
      }
    }
    await userCart.save();
    await this.cartModel.deleteOne({ _id: guestCart._id }).exec();
    return this.findByUser(userId);
  }
}
