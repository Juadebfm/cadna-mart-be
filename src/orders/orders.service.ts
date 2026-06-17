import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  DeliveryAddressSnapshot,
  DeliveryMode,
  MoneySnapshot,
  Order,
  OrderItemSnapshot,
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderPricing,
  OrderStatus,
  OrderTimelineEntry,
  OrderTrackingEvent,
  PickupDetailsSnapshot,
} from './schemas/order.schema';
import { OrdersRepository } from './orders.repository';
import { OrderQueryDto } from './dto/order-query.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  private formatMoney(amount: number): MoneySnapshot {
    return {
      amount,
      currency: 'NGN',
      formatted: '₦' + Math.round(amount).toLocaleString('en-NG'),
    };
  }

  private generateOrderRef(): string {
    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hex = randomBytes(3).toString('hex').toUpperCase();
    return `CM-${yyyy}${mm}${dd}-${hex}`;
  }

  private toDto(order: Order): object {
    const id = (order as unknown as { _id: { toString(): string } })._id.toString();
    return {
      id,
      orderRef: order.orderRef,
      userId: order.userId,
      guestEmail: order.guestEmail,
      guestPhone: order.guestPhone,
      items: order.items,
      deliveryAddress: order.deliveryAddress,
      deliveryMode: order.deliveryMode,
      pickupDetails: order.pickupDetails,
      pricing: order.pricing,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paystackReference: order.paystackReference,
      timeline: order.timeline,
      tracking: order.tracking,
      cancelReason: order.cancelReason,
      cancelledAt: order.cancelledAt,
      cartRef: order.cartRef,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async create(data: {
    userId: string | null;
    guestEmail: string | null;
    guestPhone: string | null;
    items: OrderItemSnapshot[];
    deliveryAddress: DeliveryAddressSnapshot;
    deliveryMode: DeliveryMode;
    pickupDetails: PickupDetailsSnapshot | null;
    pricing: OrderPricing;
    paymentMethod: OrderPaymentMethod | null;
    cartRef: string | null;
  }): Promise<Order> {
    const orderRef = this.generateOrderRef();
    const now = new Date();
    const initialEntry: OrderTimelineEntry = {
      status: OrderStatus.PENDING_PAYMENT,
      timestamp: now,
      note: 'Order placed',
    };

    const order = await this.ordersRepository.create({
      orderRef,
      userId: data.userId ? (data.userId as unknown as Order['userId']) : null,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      items: data.items,
      deliveryAddress: data.deliveryAddress,
      deliveryMode: data.deliveryMode,
      pickupDetails: data.pickupDetails,
      pricing: data.pricing,
      paymentMethod: data.paymentMethod,
      cartRef: data.cartRef,
      timeline: [initialEntry],
    } as unknown as Partial<Order>);

    return order;
  }

  async findByUser(
    userId: string,
    query: OrderQueryDto,
  ): Promise<{ items: object[]; pagination: object }> {
    const { items, totalItems } = await this.ordersRepository.findByUserId(
      userId,
      query.page,
      query.limit,
    );

    const totalPages = Math.ceil(totalItems / query.limit);

    return {
      items: items.map((o) => this.toDto(o)),
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages,
      },
    };
  }

  async findById(orderId: string, userId: string | null): Promise<object> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (userId !== null) {
      const orderUserId = order.userId ? order.userId.toString() : null;
      if (orderUserId !== userId) {
        throw new ForbiddenException('Access denied');
      }
    }
    return this.toDto(order);
  }

  async findByGuestLookup(orderId: string, guestPhone: string): Promise<object> {
    const order = await this.ordersRepository.findByGuestLookup(orderId, guestPhone);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.toDto(order);
  }

  async cancel(orderId: string, userId: string, reason?: string): Promise<object> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const orderUserId = order.userId ? order.userId.toString() : null;
    if (orderUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const nonCancellableStatuses: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.REFUNDED,
    ];

    if (nonCancellableStatuses.includes(order.status)) {
      throw new BadRequestException(`Order cannot be cancelled in status: ${order.status}`);
    }

    const id = (order as unknown as { _id: { toString(): string } })._id.toString();

    await this.ordersRepository.updateStatus(id, OrderStatus.CANCELLED, reason);

    if (reason) {
      await this.ordersRepository.update(id, { cancelReason: reason } as Partial<Order>);
    }

    const updated = await this.ordersRepository.findById(id);
    if (!updated) {
      throw new NotFoundException('Order not found after update');
    }
    return this.toDto(updated);
  }

  async findBySeller(
    sellerId: string,
    query: OrderQueryDto,
  ): Promise<{ items: object[]; pagination: object }> {
    const { items, totalItems } = await this.ordersRepository.findBySellerId(
      sellerId,
      query.page,
      query.limit,
    );
    const totalPages = Math.ceil(totalItems / query.limit);
    return {
      items: items.map((o) => this.toDto(o)),
      pagination: { page: query.page, limit: query.limit, totalItems, totalPages },
    };
  }

  async findAllAdmin(
    page: number,
    limit: number,
    status?: string,
  ): Promise<{ items: object[]; pagination: object }> {
    const filters = status ? { status } : {};
    const { items, totalItems } = await this.ordersRepository.findAll(page, limit, filters);
    const totalPages = Math.ceil(totalItems / limit);
    return {
      items: items.map((o) => this.toDto(o)),
      pagination: { page, limit, totalItems, totalPages },
    };
  }

  async adminStatusTransition(
    orderId: string,
    status: OrderStatus,
    note: string | undefined,
  ): Promise<object> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    await this.ordersRepository.updateStatus(orderId, status, note);
    const updated = await this.ordersRepository.findById(orderId);
    if (!updated) throw new NotFoundException('Order not found after update');
    return this.toDto(updated);
  }

  async updatePaymentStatus(
    orderId: string,
    status: OrderPaymentStatus,
    paystackReference?: string,
  ): Promise<void> {
    const updateData: Partial<Order> = { paymentStatus: status } as Partial<Order>;
    if (paystackReference) {
      (updateData as Record<string, unknown>)['paystackReference'] = paystackReference;
    }
    await this.ordersRepository.update(orderId, updateData);

    if (status === OrderPaymentStatus.PAID) {
      await this.ordersRepository.updateStatus(orderId, OrderStatus.CONFIRMED, 'Payment confirmed');
    }
  }

  async getTimeline(
    orderId: string,
    userId: string | null,
  ): Promise<{ timeline: OrderTimelineEntry[] }> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (userId !== null) {
      const orderUserId = order.userId ? order.userId.toString() : null;
      if (orderUserId !== userId) {
        throw new ForbiddenException('Access denied');
      }
    }
    return { timeline: order.timeline };
  }

  async getTracking(
    orderId: string,
    userId: string | null,
  ): Promise<{ orderId: string; tracking: OrderTrackingEvent[] }> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (userId !== null) {
      const orderUserId = order.userId ? order.userId.toString() : null;
      if (orderUserId !== userId) {
        throw new ForbiddenException('Access denied');
      }
    }
    return { orderId, tracking: order.tracking };
  }

  async getInvoice(orderId: string, userId: string | null): Promise<object> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (userId !== null) {
      const orderUserId = order.userId ? order.userId.toString() : null;
      if (orderUserId !== userId) {
        throw new ForbiddenException('Access denied');
      }
    }
    return {
      orderRef: order.orderRef,
      date: order.createdAt,
      items: order.items,
      pricing: order.pricing,
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
    };
  }

  async getPod(orderId: string, userId: string | null): Promise<object> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (userId !== null) {
      const orderUserId = order.userId ? order.userId.toString() : null;
      if (orderUserId !== userId) {
        throw new ForbiddenException('Access denied');
      }
    }
    return {
      orderId,
      orderRef: order.orderRef,
      deliveryMode: order.deliveryMode,
      status: order.status,
      artifacts: [],
    };
  }
}
