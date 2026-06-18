import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PartnerProfile,
  PartnerProfileSchema,
  PartnerCommitment,
  PartnerCommitmentSchema,
  PartnerDispute,
  PartnerDisputeSchema,
} from './schemas/partner-profile.schema';
import { PartnersController, AdminPartnersController } from './partners.controller';
import { PartnersRepository } from './partners.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PartnerProfile.name, schema: PartnerProfileSchema },
      { name: PartnerCommitment.name, schema: PartnerCommitmentSchema },
      { name: PartnerDispute.name, schema: PartnerDisputeSchema },
    ]),
  ],
  controllers: [PartnersController, AdminPartnersController],
  providers: [PartnersRepository],
  exports: [PartnersRepository],
})
export class PartnersModule {}
