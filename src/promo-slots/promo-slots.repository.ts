import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SlotType } from './schemas/slot-type.schema';
import { DurationTier } from './schemas/duration-tier.schema';
import { PromoSlot, PromoSlotStatus } from './schemas/promo-slot.schema';
import { SlotBooking, BookingStatus } from './schemas/slot-booking.schema';

@Injectable()
export class PromoSlotsRepository {
  constructor(
    @InjectModel(SlotType.name) private readonly slotTypeModel: Model<SlotType>,
    @InjectModel(DurationTier.name) private readonly tierModel: Model<DurationTier>,
    @InjectModel(PromoSlot.name) private readonly slotModel: Model<PromoSlot>,
    @InjectModel(SlotBooking.name) private readonly bookingModel: Model<SlotBooking>,
  ) {}

  async createSlotType(data: Partial<SlotType>): Promise<SlotType> {
    return this.slotTypeModel.create(data);
  }

  async findAllSlotTypes(): Promise<SlotType[]> {
    return this.slotTypeModel.find({ deletedAt: null }).lean().exec() as Promise<SlotType[]>;
  }

  async findSlotTypeById(id: string): Promise<SlotType | null> {
    return this.slotTypeModel
      .findOne({ _id: new Types.ObjectId(id), deletedAt: null })
      .lean()
      .exec() as Promise<SlotType | null>;
  }

  async updateSlotType(id: string, data: Partial<SlotType>): Promise<SlotType | null> {
    return this.slotTypeModel
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec() as Promise<SlotType | null>;
  }

  async softDeleteSlotType(id: string): Promise<void> {
    await this.slotTypeModel.findByIdAndUpdate(id, { deletedAt: new Date() }).exec();
  }

  async createTier(data: Partial<DurationTier>): Promise<DurationTier> {
    return this.tierModel.create(data);
  }

  async findAllTiers(slotTypeId?: string): Promise<DurationTier[]> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (slotTypeId) filter['slotTypeId'] = new Types.ObjectId(slotTypeId);
    return this.tierModel.find(filter).lean().exec() as Promise<DurationTier[]>;
  }

  async findTierById(id: string): Promise<DurationTier | null> {
    return this.tierModel
      .findOne({ _id: new Types.ObjectId(id), deletedAt: null })
      .lean()
      .exec() as Promise<DurationTier | null>;
  }

  async updateTier(id: string, data: Partial<DurationTier>): Promise<DurationTier | null> {
    return this.tierModel
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec() as Promise<DurationTier | null>;
  }

  async softDeleteTier(id: string): Promise<void> {
    await this.tierModel.findByIdAndUpdate(id, { deletedAt: new Date() }).exec();
  }

  async findAvailableSlots(slotTypeId?: string): Promise<PromoSlot[]> {
    const filter: Record<string, unknown> = {
      deletedAt: null,
      status: { $ne: PromoSlotStatus.FULL },
    };
    if (slotTypeId) filter['slotTypeId'] = new Types.ObjectId(slotTypeId);
    return this.slotModel.find(filter).sort({ startsAt: 1 }).lean().exec() as Promise<PromoSlot[]>;
  }

  async findSlotById(id: string): Promise<PromoSlot | null> {
    return this.slotModel
      .findOne({ _id: new Types.ObjectId(id), deletedAt: null })
      .lean()
      .exec() as Promise<PromoSlot | null>;
  }

  async createSlot(data: Partial<PromoSlot>): Promise<PromoSlot> {
    return this.slotModel.create(data);
  }

  async incrementSlotBooked(id: string, capacity: number): Promise<void> {
    const slot = await this.slotModel.findById(id).exec();
    if (!slot) return;
    const newBooked = (slot.bookedCount ?? 0) + 1;
    const newStatus =
      newBooked >= capacity ? PromoSlotStatus.FULL : PromoSlotStatus.PARTIALLY_BOOKED;
    await this.slotModel
      .findByIdAndUpdate(id, { bookedCount: newBooked, status: newStatus })
      .exec();
  }

  async createBooking(data: Partial<SlotBooking>): Promise<SlotBooking> {
    return this.bookingModel.create(data);
  }

  async findBookingById(id: string): Promise<SlotBooking | null> {
    return this.bookingModel
      .findOne({ _id: new Types.ObjectId(id), deletedAt: null })
      .lean()
      .exec() as Promise<SlotBooking | null>;
  }

  async findBookingsBySeller(
    sellerId: string,
    page: number,
    limit: number,
  ): Promise<{ items: SlotBooking[]; totalItems: number }> {
    const filter = { sellerId: new Types.ObjectId(sellerId), deletedAt: null };
    const [items, totalItems] = await Promise.all([
      this.bookingModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as Promise<SlotBooking[]>,
      this.bookingModel.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }

  async findAllBookings(
    page: number,
    limit: number,
    status?: BookingStatus,
  ): Promise<{ items: SlotBooking[]; totalItems: number }> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (status) filter['status'] = status;
    const [items, totalItems] = await Promise.all([
      this.bookingModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as Promise<SlotBooking[]>,
      this.bookingModel.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }

  async updateBooking(id: string, data: Partial<SlotBooking>): Promise<SlotBooking | null> {
    return this.bookingModel
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec() as Promise<SlotBooking | null>;
  }
}
