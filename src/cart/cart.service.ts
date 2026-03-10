import { Injectable, NotFoundException } from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { Cart } from './schemas/cart.schema';

export interface MoneyDto {
  amount: number;
  currency: string;
  formatted: string;
}

function formatMoney(amount: number, currency = 'NGN'): MoneyDto {
  return {
    amount,
    currency,
    formatted: `${currency} ${amount.toLocaleString()}`,
  };
}

@Injectable()
export class CartService {
  constructor(private readonly cartRepository: CartRepository) {}

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

  private toDto(cart: Cart) {
    const id = (cart as unknown as { _id: { toString(): string } })._id.toString();

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
