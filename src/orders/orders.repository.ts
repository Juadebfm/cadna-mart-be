import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { createPublicId } from '@database/id.util';
import { Prisma } from '../generated/prisma/client';
import { Order, OrderPaymentStatus, OrderStatus, OrderTimelineEntry } from './schemas/order.schema';
import { OrderQueryDto } from './dto/order-query.dto';

@Injectable()
export class OrdersRepository {
  constructor(public readonly prisma: PrismaService) {}

  private legacy(row: any): Order | null {
    return row ? ({ ...row, _id: row.id } as unknown as Order) : null;
  }
  private json(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
  private matchesItems(order: any, search: string) {
    return (
      Array.isArray(order.items) &&
      order.items.some((item: any) =>
        String(item.name ?? '')
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    );
  }
  private orderWhere(query: OrderQueryDto) {
    return {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
  }

  async create(data: Partial<Order>): Promise<Order> {
    const value = data as any;
    return this.legacy(
      await this.prisma.order.create({
        data: {
          id: createPublicId(),
          orderRef: value.orderRef,
          userId: value.userId ?? null,
          guestEmail: value.guestEmail ?? null,
          guestPhone: value.guestPhone ?? null,
          items: this.json(value.items ?? []),
          deliveryAddress: this.json(value.deliveryAddress),
          deliveryMode: value.deliveryMode ?? 'standard',
          pickupDetails: value.pickupDetails ? this.json(value.pickupDetails) : undefined,
          pricing: this.json(value.pricing),
          status: value.status ?? OrderStatus.PENDING_PAYMENT,
          paymentStatus: value.paymentStatus ?? OrderPaymentStatus.UNPAID,
          paymentMethod: value.paymentMethod ?? null,
          paystackReference: value.paystackReference ?? null,
          timeline: this.json(value.timeline ?? []),
          tracking: this.json(value.tracking ?? []),
          cancelReason: value.cancelReason ?? null,
          cancelledAt: value.cancelledAt ?? null,
          cartRef: value.cartRef ?? null,
          deletedAt: value.deletedAt ?? null,
        },
      }),
    )!;
  }

  async findById(id: string): Promise<Order | null> {
    return this.legacy(await this.prisma.order.findFirst({ where: { id, deletedAt: null } }));
  }
  async findByOrderRef(orderRef: string): Promise<Order | null> {
    return this.legacy(await this.prisma.order.findFirst({ where: { orderRef, deletedAt: null } }));
  }
  async findByPaystackReference(reference: string): Promise<Order | null> {
    return this.legacy(
      await this.prisma.order.findFirst({
        where: { paystackReference: reference, deletedAt: null },
      }),
    );
  }
  async findByGuestLookup(id: string, guestPhone: string): Promise<Order | null> {
    return this.legacy(
      await this.prisma.order.findFirst({ where: { id, guestPhone, deletedAt: null } }),
    );
  }

  async findByUserId(userId: string, query: OrderQueryDto) {
    const where = { ...this.orderWhere(query), userId };
    const search = query.search?.trim().toLowerCase();
    const rows = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...(search ? {} : { skip: (query.page - 1) * query.limit, take: query.limit }),
    });
    const filtered = search
      ? rows.filter(
          (row) => row.orderRef.toLowerCase().includes(search) || this.matchesItems(row, search),
        )
      : rows;
    const totalItems = search ? filtered.length : await this.prisma.order.count({ where });
    const items = search
      ? filtered.slice((query.page - 1) * query.limit, query.page * query.limit)
      : filtered;
    return { items: items.map((row) => this.legacy(row)!), totalItems };
  }

  async findAllByUserId(userId: string, query: OrderQueryDto): Promise<Order[]> {
    const search = query.search?.trim().toLowerCase();
    const rows = await this.prisma.order.findMany({
      where: { ...this.orderWhere(query), userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows
      .filter(
        (row) =>
          !search || row.orderRef.toLowerCase().includes(search) || this.matchesItems(row, search),
      )
      .map((row) => this.legacy(row)!);
  }

  async updateBuyerDeliveryAddress(
    userId: string,
    orderId: string,
    deliveryAddress: Order['deliveryAddress'],
  ): Promise<Order | null> {
    const current = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        deletedAt: null,
        status: {
          notIn: [
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED,
            OrderStatus.REFUNDED,
          ],
        },
      },
    });
    if (!current) return null;
    return this.legacy(
      await this.prisma.order.update({
        where: { id: orderId },
        data: { deliveryAddress: this.json(deliveryAddress) },
      }),
    );
  }

  async cancelByBuyer(userId: string, orderId: string, reason?: string): Promise<Order | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
      const current = await tx.order.findFirst({
        where: {
          id: orderId,
          userId,
          deletedAt: null,
          status: OrderStatus.PENDING_PAYMENT,
          paymentStatus: OrderPaymentStatus.UNPAID,
        },
      });
      if (!current) return null;
      const timestamp = new Date();
      const timeline = [
        ...(Array.isArray(current.timeline) ? (current.timeline as any[]) : []),
        { status: OrderStatus.CANCELLED, timestamp, note: reason ?? 'Cancelled by buyer' },
      ];
      return this.legacy(
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: timestamp,
            cancelReason: reason ?? null,
            timeline: this.json(timeline),
          },
        }),
      );
    });
  }

  async updateStatus(id: string, status: OrderStatus, note?: string): Promise<Order | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${id} FOR UPDATE`;
      const current = await tx.order.findFirst({ where: { id, deletedAt: null } });
      if (!current) return null;
      const timestamp = new Date();
      const entry: OrderTimelineEntry = { status, timestamp, note: note ?? null };
      const timeline = [
        ...(Array.isArray(current.timeline) ? (current.timeline as any[]) : []),
        entry,
      ];
      return this.legacy(
        await tx.order.update({
          where: { id },
          data: {
            status,
            timeline: this.json(timeline),
            ...(status === OrderStatus.CANCELLED ? { cancelledAt: timestamp } : {}),
          },
        }),
      );
    });
  }

  async transitionStatusIfCurrent(
    id: string,
    allowedStatuses: OrderStatus[],
    status: OrderStatus,
    note?: string,
  ): Promise<Order | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${id} FOR UPDATE`;
      const current = await tx.order.findFirst({
        where: { id, deletedAt: null, status: { in: allowedStatuses } },
      });
      if (!current) return null;
      const entry: OrderTimelineEntry = { status, timestamp: new Date(), note: note ?? null };
      return this.legacy(
        await tx.order.update({
          where: { id },
          data: {
            status,
            timeline: this.json([
              ...(Array.isArray(current.timeline) ? (current.timeline as any[]) : []),
              entry,
            ]),
          },
        }),
      );
    });
  }

  async reserveReturnQuantity(
    orderId: string,
    requestId: string,
    productId: string,
    variantId: string | null,
    quantity: number,
    purchasedQuantity: number,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
      const order = await tx.order.findFirst({ where: { id: orderId, deletedAt: null } });
      if (!order) return false;
      const reservations = Array.isArray(order.returnQuantityReservations)
        ? (order.returnQuantityReservations as any[])
        : [];
      const reserved = reservations
        .filter((item) => item.productId === productId && (item.variantId ?? null) === variantId)
        .reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
      if (reserved + quantity > purchasedQuantity) return false;
      reservations.push({ requestId, productId, variantId, quantity });
      await tx.order.update({
        where: { id: orderId },
        data: { returnQuantityReservations: this.json(reservations) },
      });
      return true;
    });
  }

  async releaseReturnQuantity(orderId: string, requestId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;
    const reservations = Array.isArray(order.returnQuantityReservations)
      ? (order.returnQuantityReservations as any[])
      : [];
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        returnQuantityReservations: this.json(
          reservations.filter((item) => item.requestId !== requestId),
        ),
      },
    });
  }

  async update(id: string, data: Partial<Order>): Promise<Order | null> {
    const mapped: any = { ...(data as any) };
    for (const key of [
      'items',
      'deliveryAddress',
      'pickupDetails',
      'pricing',
      'timeline',
      'tracking',
      'returnQuantityReservations',
    ])
      if (key in mapped && mapped[key] !== null) mapped[key] = this.json(mapped[key]);
    try {
      return this.legacy(await this.prisma.order.update({ where: { id }, data: mapped }));
    } catch {
      return null;
    }
  }

  async reserveRefund(orderId: string, requestId: string, amount: number): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          deletedAt: null,
          paymentStatus: OrderPaymentStatus.PAID,
          refundInProgressRequestId: null,
        },
      });
      if (!order) return false;
      const pricing = order.pricing as any;
      const total = Number(pricing?.total?.amount ?? 0);
      if (order.refundedAmount + order.reservedRefundAmount + amount > total) return false;
      await tx.order.update({
        where: { id: orderId },
        data: { refundInProgressRequestId: requestId, reservedRefundAmount: { increment: amount } },
      });
      return true;
    });
  }

  async finishRefundReservation(
    orderId: string,
    requestId: string,
    amount: number,
    processed: boolean,
  ): Promise<void> {
    const current = await this.prisma.order.findFirst({
      where: { id: orderId, refundInProgressRequestId: requestId },
    });
    if (!current) return;
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        refundInProgressRequestId: null,
        reservedRefundAmount: { decrement: amount },
        ...(processed ? { refundedAmount: { increment: amount } } : {}),
      },
    });
  }

  async findBySellerId(sellerId: string, page: number, limit: number) {
    const rows = await this.prisma.order.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    const filtered = rows.filter(
      (order) =>
        Array.isArray(order.items) &&
        (order.items as any[]).some((item) => item.sellerId === sellerId),
    );
    return {
      items: filtered.slice((page - 1) * limit, page * limit).map((row) => this.legacy(row)!),
      totalItems: filtered.length,
    };
  }

  async findAll(page: number, limit: number, filters: Record<string, unknown> = {}) {
    const where = { ...filters, deletedAt: null } as any;
    const [rows, totalItems] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items: rows.map((row) => this.legacy(row)!), totalItems };
  }
}
