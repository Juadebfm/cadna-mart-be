import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { CheckoutSession, CheckoutSessionStatus } from './schemas/checkout-session.schema';
import { CreateCheckoutSessionDto } from './dto/checkout-session.dto';
import { SetCheckoutAddressDto } from './dto/set-address.dto';
import { SelectDeliveryDto } from './dto/select-delivery.dto';
import { PickupDetailsDto } from './dto/pickup-details.dto';
import { OrdersService } from '../orders/orders.service';
import { CartRepository } from '@cart/cart.repository';
import { DeliveryMode, OrderItemSnapshot, OrderPricing } from '../orders/schemas/order.schema';

@Injectable()
export class CheckoutService {
  private readonly STANDARD_FEE = 1500;
  private readonly EXPRESS_FEE = 3000;
  private readonly PICKUP_FEE = 0;
  private readonly VAT_RATE = 0.075;
  private readonly SESSION_TTL_MINUTES = 30;

  constructor(
    @InjectModel(CheckoutSession.name) private readonly sessionModel: Model<CheckoutSession>,
    private readonly ordersService: OrdersService,
    private readonly cartRepository: CartRepository,
  ) {}

  private formatMoney(amount: number): { amount: number; currency: string; formatted: string } {
    return {
      amount,
      currency: 'NGN',
      formatted: '₦' + Math.round(amount).toLocaleString('en-NG'),
    };
  }

  private computePricing(subtotal: number, deliveryFee: number): OrderPricing {
    const tax = subtotal * this.VAT_RATE;
    const total = subtotal + deliveryFee + tax;
    return {
      subtotal: this.formatMoney(subtotal),
      deliveryFee: this.formatMoney(deliveryFee),
      tax: this.formatMoney(tax),
      total: this.formatMoney(total),
      currency: 'NGN',
    };
  }

  private getCartSubtotal(cart: any): number {
    let sum = 0;
    for (const item of cart.items) {
      const product = item.product as any;
      const variant = product?.variants?.find((v: any) => v.id === item.variantId);
      const price = variant?.price ?? product?.price;
      const priceAmount = price?.amount ?? price ?? 0;
      sum += priceAmount * item.quantity;
    }
    return sum;
  }

  private assertSessionActive(session: CheckoutSession | null, _sessionId: string): void {
    if (!session) {
      throw new NotFoundException('Checkout session not found');
    }
    if (session.status === CheckoutSessionStatus.EXPIRED) {
      throw new BadRequestException('Checkout session has expired');
    }
    if (session.status === CheckoutSessionStatus.CONFIRMED) {
      throw new BadRequestException('Checkout session is already confirmed');
    }
  }

  async createSession(
    dto: CreateCheckoutSessionDto,
    userId: string | null,
  ): Promise<{ sessionId: string; status: string; expiresAt: Date }> {
    const cart = await this.cartRepository.findByPublicId(dto.cartId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + this.SESSION_TTL_MINUTES * 60 * 1000);

    const metadata: Record<string, unknown> = {};
    if (dto.guestEmail) metadata['guestEmail'] = dto.guestEmail;
    if (dto.guestPhone) metadata['guestPhone'] = dto.guestPhone;

    await this.sessionModel.create({
      sessionId,
      cartId: dto.cartId,
      userId: userId ?? null,
      status: CheckoutSessionStatus.INITIATED,
      expiresAt,
      metadata,
    });

    return { sessionId, status: 'initiated', expiresAt };
  }

  async getSession(sessionId: string): Promise<object> {
    const session = await this.sessionModel.findOne({ sessionId, deletedAt: null }).lean().exec();
    if (!session) {
      throw new NotFoundException('Checkout session not found');
    }
    return {
      sessionId: session.sessionId,
      cartId: session.cartId,
      status: session.status,
      deliveryAddress: session.deliveryAddress,
      deliveryMode: session.deliveryMode,
      pricingSnapshot: session.pricingSnapshot,
      pricingLocked: session.pricingLocked,
      expiresAt: session.expiresAt,
    };
  }

  async setAddress(sessionId: string, dto: SetCheckoutAddressDto): Promise<object> {
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    this.assertSessionActive(session, sessionId);

    const updated = await this.sessionModel
      .findOneAndUpdate(
        { sessionId },
        {
          $set: {
            deliveryAddress: dto,
            addressValidated: false,
            status: CheckoutSessionStatus.ADDRESS_SET,
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    return {
      sessionId,
      status: 'address_set',
      deliveryAddress: updated?.deliveryAddress ?? dto,
    };
  }

  async validateAddress(sessionId: string): Promise<object> {
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    this.assertSessionActive(session, sessionId);

    if (!session!.deliveryAddress) {
      throw new BadRequestException('Set a delivery address first');
    }

    await this.sessionModel.updateOne({ sessionId }, { $set: { addressValidated: true } }).exec();

    return {
      sessionId,
      validated: true,
      deliveryAddress: session!.deliveryAddress,
    };
  }

  async getDeliveryOptions(sessionId: string): Promise<object> {
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    this.assertSessionActive(session, sessionId);

    return {
      sessionId,
      options: [
        {
          mode: 'standard',
          label: 'Standard Delivery (2-5 days)',
          fee: this.formatMoney(this.STANDARD_FEE),
          estimatedDays: '2-5',
        },
        {
          mode: 'express',
          label: 'Express Delivery (1-2 days)',
          fee: this.formatMoney(this.EXPRESS_FEE),
          estimatedDays: '1-2',
        },
        {
          mode: 'pickup',
          label: 'Pickup (bring ID)',
          fee: this.formatMoney(this.PICKUP_FEE),
          estimatedDays: null,
        },
      ],
    };
  }

  async selectDelivery(sessionId: string, dto: SelectDeliveryDto): Promise<object> {
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    this.assertSessionActive(session, sessionId);

    await this.sessionModel
      .updateOne(
        { sessionId },
        {
          $set: {
            deliveryMode: dto.mode,
            status: CheckoutSessionStatus.DELIVERY_SET,
            pricingLocked: false,
          },
        },
      )
      .exec();

    return { sessionId, status: 'delivery_set', deliveryMode: dto.mode };
  }

  async setPickupDetails(sessionId: string, dto: PickupDetailsDto): Promise<object> {
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    this.assertSessionActive(session, sessionId);

    if (session!.deliveryMode !== 'pickup') {
      throw new BadRequestException('Pickup details only apply to pickup delivery mode');
    }

    await this.sessionModel.updateOne({ sessionId }, { $set: { pickupDetails: dto } }).exec();

    return { sessionId, pickupDetails: dto };
  }

  async getSummary(sessionId: string): Promise<object> {
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    this.assertSessionActive(session, sessionId);

    if (!session!.deliveryAddress) {
      throw new BadRequestException('Set delivery address first');
    }
    if (!session!.deliveryMode) {
      throw new BadRequestException('Select delivery mode first');
    }

    const cart = await this.cartRepository.findByPublicId(session!.cartId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const subtotal = this.getCartSubtotal(cart);
    const mode = session!.deliveryMode;
    const feeAmount =
      mode === 'express'
        ? this.EXPRESS_FEE
        : mode === 'pickup'
          ? this.PICKUP_FEE
          : this.STANDARD_FEE;

    const pricing = this.computePricing(subtotal, feeAmount);

    await this.sessionModel
      .updateOne(
        { sessionId },
        {
          $set: {
            pricingSnapshot: pricing,
            pricingLocked: true,
            status: CheckoutSessionStatus.SUMMARY_READY,
          },
        },
      )
      .exec();

    return {
      sessionId,
      status: 'summary_ready',
      pricingLocked: true,
      cart: { itemCount: cart.items.length },
      deliveryAddress: session!.deliveryAddress,
      deliveryMode: session!.deliveryMode,
      pricing,
      expiresAt: session!.expiresAt,
    };
  }

  async confirmSession(sessionId: string, userId: string | null): Promise<object> {
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    this.assertSessionActive(session, sessionId);

    if (session!.status !== CheckoutSessionStatus.SUMMARY_READY) {
      throw new BadRequestException('Review the order summary before confirming');
    }

    const cart = await this.cartRepository.findByPublicId(session!.cartId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const items: OrderItemSnapshot[] = cart.items.map((item) => {
      const product = item.product as any;
      const variant = product?.variants?.find((v: any) => v.id === item.variantId);
      const unitPrice = variant?.price ??
        product?.price ?? { amount: 0, currency: 'NGN', formatted: '₦0' };
      const lineTotal = this.formatMoney(unitPrice.amount * item.quantity);
      return {
        productId: product?._id?.toString() ?? '',
        variantId: item.variantId,
        name: product?.name ?? '',
        sku: variant?.sku ?? product?.sku ?? null,
        thumbnailUrl: product?.thumbnailUrl ?? null,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
        sellerId: product?.seller?._id?.toString() ?? null,
      };
    });

    const pricing = session!.pricingSnapshot as any;
    const metadata = (session as unknown as { metadata: Record<string, unknown> }).metadata ?? {};

    const order = await this.ordersService.create({
      userId: userId ?? null,
      guestEmail: (metadata['guestEmail'] as string) ?? null,
      guestPhone: (metadata['guestPhone'] as string) ?? null,
      items,
      deliveryAddress: session!.deliveryAddress as any,
      deliveryMode: session!.deliveryMode as DeliveryMode,
      pickupDetails: session!.pickupDetails as any,
      pricing,
      paymentMethod: null,
      cartRef: session!.cartId,
    });

    const orderId = (order as unknown as { _id: { toString(): string } })._id;

    await this.sessionModel
      .updateOne({ sessionId }, { $set: { status: CheckoutSessionStatus.CONFIRMED, orderId } })
      .exec();

    return {
      sessionId,
      status: 'confirmed',
      orderId: orderId.toString(),
      orderRef: order.orderRef,
      pricing: order.pricing,
    };
  }
}
