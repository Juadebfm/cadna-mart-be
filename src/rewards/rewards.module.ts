import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RewardsProgram,
  RewardsProgramSchema,
  RewardsTier,
  RewardsTierSchema,
  RewardsCampaign,
  RewardsCampaignSchema,
  RewardsAccount,
  RewardsAccountSchema,
  RewardsTransaction,
  RewardsTransactionSchema,
} from './schemas/rewards.schema';
import { RewardsController, AdminRewardsController } from './rewards.controller';
import { RewardsRepository } from './rewards.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RewardsProgram.name, schema: RewardsProgramSchema },
      { name: RewardsTier.name, schema: RewardsTierSchema },
      { name: RewardsCampaign.name, schema: RewardsCampaignSchema },
      { name: RewardsAccount.name, schema: RewardsAccountSchema },
      { name: RewardsTransaction.name, schema: RewardsTransactionSchema },
    ]),
  ],
  controllers: [RewardsController, AdminRewardsController],
  providers: [RewardsRepository],
  exports: [RewardsRepository],
})
export class RewardsModule {}
