import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LogisticsBooking,
  LogisticsProvider,
  BookingStatus,
} from './schemas/logistics-booking.schema';
import { LogisticsRepository } from './logistics.repository';
import { LogisticsQuoteDto, CoverageCheckDto, BookCourierDto, PodUploadDto } from './dto/quote.dto';
import { Types } from 'mongoose';

@Injectable()
export class LogisticsService {
  constructor(private readonly repo: LogisticsRepository) {}

  private toDto(b: LogisticsBooking): object {
    const id = (b as unknown as { _id: { toString(): string } })._id.toString();
    return {
      id,
      bookingRef: b.bookingRef,
      orderId: b.orderId,
      orderRef: b.orderRef,
      provider: b.provider,
      status: b.status,
      externalBookingId: b.externalBookingId,
      trackingUrl: b.trackingUrl,
      pickupAddress: b.pickupAddress,
      dropoffAddress: b.dropoffAddress,
      trackingEvents: b.trackingEvents,
      podArtifacts: b.podArtifacts,
      quotedFeeKobo: b.quotedFeeKobo,
      cancelReason: b.cancelReason,
      retryCount: b.retryCount,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }

  getQuote(_dto: LogisticsQuoteDto): object {
    return {
      estimates: [
        {
          provider: LogisticsProvider.UBER,
          available: false,
          note: 'Uber delivery integration deferred — provider partnership pending',
          estimatedFeeNGN: null,
          estimatedMinutes: null,
        },
        {
          provider: LogisticsProvider.BOLT,
          available: false,
          note: 'Bolt delivery integration deferred — provider partnership pending',
          estimatedFeeNGN: null,
          estimatedMinutes: null,
        },
        {
          provider: LogisticsProvider.IN_HOUSE,
          available: true,
          estimatedFeeNGN: 1500,
          estimatedMinutes: 120,
        },
      ],
    };
  }

  checkCoverage(dto: CoverageCheckDto): object {
    const covered = dto.city.toLowerCase().includes('lagos');
    return {
      city: dto.city,
      address: dto.address,
      covered,
      note: covered
        ? 'Lagos delivery is supported in V1'
        : 'Only Lagos delivery is supported in V1',
    };
  }

  async bookCourier(dto: BookCourierDto): Promise<object> {
    const booking = await this.repo.create({
      orderId: new Types.ObjectId(dto.orderId) as unknown as LogisticsBooking['orderId'],
      orderRef: dto.orderRef,
      provider: LogisticsProvider.IN_HOUSE,
      status: BookingStatus.PENDING,
    } as Partial<LogisticsBooking>);
    return this.toDto(booking);
  }

  async getBooking(id: string): Promise<object> {
    const b = await this.repo.findById(id);
    if (!b) throw new NotFoundException('Booking not found');
    return this.toDto(b);
  }

  async cancelBooking(id: string, reason?: string): Promise<object> {
    const b = await this.repo.findById(id);
    if (!b) throw new NotFoundException('Booking not found');
    const updated = await this.repo.update(id, {
      status: BookingStatus.CANCELLED,
      cancelReason: reason ?? null,
    } as Partial<LogisticsBooking>);
    if (!updated) throw new NotFoundException('Booking not found after update');
    return this.toDto(updated);
  }

  async retryBooking(id: string): Promise<object> {
    const b = await this.repo.findById(id);
    if (!b) throw new NotFoundException('Booking not found');
    const updated = await this.repo.update(id, {
      status: BookingStatus.PENDING,
      retryCount: (b.retryCount ?? 0) + 1,
    } as Partial<LogisticsBooking>);
    if (!updated) throw new NotFoundException('Booking not found after update');
    return this.toDto(updated);
  }

  async getTracking(bookingId: string): Promise<object> {
    const b = await this.repo.findById(bookingId);
    if (!b) throw new NotFoundException('Booking not found');
    return { bookingId, bookingRef: b.bookingRef, status: b.status, events: b.trackingEvents };
  }

  async uploadPod(dto: PodUploadDto): Promise<object> {
    const b = await this.repo.findById(dto.bookingId);
    if (!b) throw new NotFoundException('Booking not found');
    const artifact: LogisticsBooking['podArtifacts'][0] = {
      type: dto.type as 'photo' | 'signature' | 'gps',
      url: dto.url ?? null,
      coordinates: null,
      capturedAt: new Date(),
    };
    await this.repo.pushPodArtifact(dto.bookingId, artifact);
    return { bookingId: dto.bookingId, artifact };
  }

  handleUberWebhook(payload: unknown): object {
    return { received: true, provider: 'uber', payload };
  }

  handleBoltWebhook(payload: unknown): object {
    return { received: true, provider: 'bolt', payload };
  }

  async pickupReady(orderId: string, note?: string): Promise<object> {
    return { orderId, action: 'ready', note: note ?? null, timestamp: new Date() };
  }

  async pickupVerify(orderId: string): Promise<object> {
    return { orderId, action: 'verify', verified: true, timestamp: new Date() };
  }

  async pickupComplete(orderId: string): Promise<object> {
    return { orderId, action: 'complete', completed: true, timestamp: new Date() };
  }

  async pickupFail(orderId: string, note?: string): Promise<object> {
    return { orderId, action: 'fail', note: note ?? null, timestamp: new Date() };
  }
}
