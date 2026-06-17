import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { randomBytes } from 'crypto';
import { CartRepository } from './cart.repository';
import { Cart, CartOwnerType } from './schemas/cart.schema';
import { ConfigService } from '@config/config.service';
import { comparePassword, hashPassword } from '@common/utils/hash.util';

export interface MoneyDto {
  amount: number;
  currency: string;
  formatted: string;
}

const DEFAULT_TAX_RATE = 0.075; // 7.5% VAT placeholder until pricing engine ships
const DEFAULT_DELIVERY_ESTIMATE = 1500; // NGN flat placeholder

function formatMoney(amount: number, currency = 'NGN'): MoneyDto {
  return {
    amount,
    currency,
    formatted: `₦${Math.round(amount).toLocaleString('en-NG')}`,
  };
}

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Auth helpers ──────────────────────────────────────────

  private async resolveUserIdFromRequest(req: Request): Promise<string | null> {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return null;
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(header.slice(7), {
        secret: this.configService.jwt.accessSecret,
      });
      return payload?.sub ?? null;
    } catch {
      return null;
    }
  }

  private async assertAccess(req: Request, cart: Cart): Promise<{ userId: string | null }> {
    const userId = await this.resolveUserIdFromRequest(req);

    if (cart.ownerType === CartOwnerType.USER) {
      const ownerId = cart.user?.toString();
      if (!userId || ownerId !== userId) {
        throw new ForbiddenException('You do not have access to this cart');
      }
      return { userId };
    }

    // Guest cart
    const guestToken = (req.headers['x-guest-token'] as string | undefined)?.trim();
    if (!guestToken) {
      throw new ForbiddenException('Missing x-guest-token header for guest cart');
    }
    const stored = await this.cartRepository.findByPublicIdWithGuestHash(cart.publicCartId);
    if (!stored || !stored.guestTokenHash) {
      throw new ForbiddenException('Cart not accessible');
    }
    const ok = await comparePassword(guestToken, stored.guestTokenHash);
    if (!ok) {
      throw new ForbiddenException('Invalid guest token');
    }
    return { userId };
  }

  // ─── Creation ──────────────────────────────────────────────

  async createCart(req: Request): Promise<{
    cartId: string;
    ownerType: CartOwnerType;
    guestToken?: string;
  }> {
    const userId = await this.resolveUserIdFromRequest(req);
    if (userId) {
      const cart = await this.cartRepository.findOrCreateForUser(userId);
      return { cartId: cart.publicCartId, ownerType: CartOwnerType.USER };
    }
    const guestToken = randomBytes(24).toString('hex');
    const hash = await hashPassword(guestToken);
    const cart = await this.cartRepository.createGuest(hash);
    return { cartId: cart.publicCartId, ownerType: CartOwnerType.GUEST, guestToken };
  }

  // ─── New cartId-scoped reads / writes ──────────────────────

  async getCartByPublicId(req: Request, cartId: string) {
    const cart = await this.cartRepository.findByPublicId(cartId);
    if (!cart) throw new NotFoundException('Cart not found');
    await this.assertAccess(req, cart);
    return this.toDto(cart);
  }

  async addItemByPublicId(
    req: Request,
    cartId: string,
    productId: string,
    variantId: string | null,
    quantity: number,
  ) {
    const cart = await this.cartRepository.findByPublicId(cartId);
    if (!cart) throw new NotFoundException('Cart not found');
    await this.assertAccess(req, cart);
    const updated = await this.cartRepository.addItemByCartId(
      cartId,
      productId,
      variantId,
      quantity,
    );
    if (!updated) throw new NotFoundException('Cart not found');
    return this.toDto(updated);
  }

  async updateItemByPublicId(req: Request, cartId: string, itemId: string, quantity: number) {
    const cart = await this.cartRepository.findByPublicId(cartId);
    if (!cart) throw new NotFoundException('Cart not found');
    await this.assertAccess(req, cart);
    const updated = await this.cartRepository.updateItemQuantityByCartId(cartId, itemId, quantity);
    if (!updated) throw new NotFoundException('Cart item not found');
    return this.toDto(updated);
  }

  async removeItemByPublicId(req: Request, cartId: string, itemId: string) {
    const cart = await this.cartRepository.findByPublicId(cartId);
    if (!cart) throw new NotFoundException('Cart not found');
    await this.assertAccess(req, cart);
    const updated = await this.cartRepository.removeItemByCartId(cartId, itemId);
    if (!updated) throw new NotFoundException('Cart item not found');
    return this.toDto(updated);
  }

  async clearByPublicId(req: Request, cartId: string) {
    const cart = await this.cartRepository.findByPublicId(cartId);
    if (!cart) throw new NotFoundException('Cart not found');
    await this.assertAccess(req, cart);
    const updated = await this.cartRepository.clearItemsByCartId(cartId);
    if (!updated) throw new NotFoundException('Cart not found');
    return this.toDto(updated);
  }

  async mergeGuestIntoUser(userId: string, guestCartId: string, guestToken: string) {
    const guest = await this.cartRepository.findByPublicIdWithGuestHash(guestCartId);
    if (!guest || guest.ownerType !== CartOwnerType.GUEST) {
      throw new NotFoundException('Guest cart not found');
    }
    if (!guest.guestTokenHash) {
      throw new ForbiddenException('Guest cart not accessible');
    }
    const ok = await comparePassword(guestToken, guest.guestTokenHash);
    if (!ok) {
      throw new ForbiddenException('Invalid guest token');
    }
    const merged = await this.cartRepository.claimGuestForUser(guestCartId, userId);
    if (!merged) throw new NotFoundException('Merge failed');
    return this.toDto(merged);
  }

  async getTotalsByPublicId(req: Request, cartId: string) {
    const cart = await this.cartRepository.findByPublicId(cartId);
    if (!cart) throw new NotFoundException('Cart not found');
    await this.assertAccess(req, cart);
    const dto = this.toDto(cart);
    const subtotal = dto.totals.subtotal.amount;
    const tax = subtotal * DEFAULT_TAX_RATE;
    const delivery = subtotal > 0 ? DEFAULT_DELIVERY_ESTIMATE : 0;
    const total = subtotal + tax + delivery;
    return {
      cartId: dto.id,
      currency: 'NGN',
      subtotal: formatMoney(subtotal),
      taxAmount: formatMoney(tax),
      taxRate: DEFAULT_TAX_RATE,
      deliveryEstimate: formatMoney(delivery),
      grandTotal: formatMoney(total),
      pricingLocked: false,
      note: 'Tax and delivery use placeholder defaults until the pricing-rule engine ships.',
    };
  }

  async validateByPublicId(req: Request, cartId: string) {
    const cart = await this.cartRepository.findByPublicId(cartId);
    if (!cart) throw new NotFoundException('Cart not found');
    await this.assertAccess(req, cart);

    const issues: Array<{ itemId: string; reason: string }> = [];
    for (const item of cart.items) {
      const product = item.product as unknown as {
        _id: { toString(): string };
        isActive: boolean;
        inventoryStatus: string;
        variants: Array<{ id: string; isInStock: boolean; stockQty: number }>;
      };
      const itemId = (item as unknown as { _id: { toString(): string } })._id.toString();
      if (!product) {
        issues.push({ itemId, reason: 'product_missing' });
        continue;
      }
      if (!product.isActive) {
        issues.push({ itemId, reason: 'product_inactive' });
        continue;
      }
      if (item.variantId) {
        const variant = product.variants?.find((v) => v.id === item.variantId);
        if (!variant) {
          issues.push({ itemId, reason: 'variant_missing' });
          continue;
        }
        if (!variant.isInStock || variant.stockQty < item.quantity) {
          issues.push({ itemId, reason: 'variant_out_of_stock' });
        }
      } else if (product.inventoryStatus !== 'in_stock') {
        issues.push({ itemId, reason: 'product_out_of_stock' });
      }
    }
    return { cartId: cart.publicCartId, valid: issues.length === 0, issues };
  }

  // ─── Legacy user-scoped methods (back-compat) ──────────────

  async getCart(userId: string) {
    const cart = await this.cartRepository.findByUser(userId);
    if (!cart) {
      return {
        id: null,
        currency: 'NGN',
        items: [],
        totals: {
          subtotal: formatMoney(0),
          shipping: formatMoney(0),
          discount: formatMoney(0),
          grandTotal: formatMoney(0),
        },
      };
    }
    return this.toDto(cart);
  }

  async addItem(userId: string, productId: string, variantId: string | null, quantity: number) {
    const cart = await this.cartRepository.addItem(userId, productId, variantId, quantity);
    return this.toDto(cart);
  }

  async updateItemQuantity(userId: string, itemId: string, quantity: number) {
    const cart = await this.cartRepository.updateItemQuantity(userId, itemId, quantity);
    if (!cart) throw new NotFoundException('Cart item not found');
    return this.toDto(cart);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.cartRepository.removeItem(userId, itemId);
    if (!cart) throw new NotFoundException('Cart item not found');
    return this.toDto(cart);
  }

  // ─── DTO ──────────────────────────────────────────────────

  private toDto(cart: Cart) {
    const id = (cart as unknown as { _id?: { toString(): string }; publicCartId: string })
      .publicCartId;

    const items = cart.items.map((item) => {
      const product = item.product as unknown as {
        _id: { toString(): string };
        name: string;
        slug: string;
        thumbnailUrl: string | null;
        price: MoneyDto;
        variants: Array<{ id: string; price: MoneyDto; stockQty: number }>;
      };

      const itemId = (item as unknown as { _id: { toString(): string } })._id.toString();
      const variant = product?.variants?.find((v) => v.id === item.variantId);
      const price = variant?.price ?? product?.price ?? formatMoney(0);
      const lineTotal = formatMoney(price.amount * item.quantity);

      return {
        itemId,
        productId: product?._id?.toString() ?? '',
        variantId: item.variantId,
        name: product?.name ?? '',
        thumbnailUrl: product?.thumbnailUrl ?? null,
        price,
        quantity: item.quantity,
        stockQty: variant?.stockQty ?? 0,
        lineTotal,
      };
    });

    const subtotalAmount = items.reduce((sum, i) => sum + i.lineTotal.amount, 0);

    return {
      id,
      cartId: id,
      ownerType: cart.ownerType,
      currency: 'NGN',
      items,
      totals: {
        subtotal: formatMoney(subtotalAmount),
        shipping: formatMoney(0),
        discount: formatMoney(0),
        grandTotal: formatMoney(subtotalAmount),
      },
    };
  }
}
