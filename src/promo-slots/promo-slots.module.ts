import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SlotType, SlotTypeSchema } from './schemas/slot-type.schema';
import { DurationTier, DurationTierSchema } from './schemas/duration-tier.schema';
import { PromoSlot, PromoSlotSchema } from './schemas/promo-slot.schema';
import { SlotBooking, SlotBookingSchema } from './schemas/slot-booking.schema';
import { PromoSlotsController } from './promo-slots.controller';
import { AdminPromoSlotsController } from './admin-promo-slots.controller';
import { PromoSlotsService } from './promo-slots.service';
import { PromoSlotsRepository } from './promo-slots.repository';
import { SellersModule } from '@sellers/sellers.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SlotType.name, schema: SlotTypeSchema },
      { name: DurationTier.name, schema: DurationTierSchema },
      { name: PromoSlot.name, schema: PromoSlotSchema },
      { name: SlotBooking.name, schema: SlotBookingSchema },
    ]),
    SellersModule,
  ],
  controllers: [PromoSlotsController, AdminPromoSlotsController],
  providers: [PromoSlotsService, PromoSlotsRepository],
  exports: [PromoSlotsService],
})
export class PromoSlotsModule {}
