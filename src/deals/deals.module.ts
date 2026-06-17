import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DealsController } from './deals.controller';
import { AdminDealsController } from './admin-deals.controller';
import { DealsService } from './deals.service';
import { DealsRepository } from './deals.repository';
import { DealCampaign, DealCampaignSchema } from './schemas/deal-campaign.schema';
import { Seller, SellerSchema } from '@sellers/schemas/seller.schema';
import { Product, ProductSchema } from '@products/schemas/product.schema';
import { User, UserSchema } from '@users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DealCampaign.name, schema: DealCampaignSchema },
      { name: Seller.name, schema: SellerSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [DealsController, AdminDealsController],
  providers: [DealsRepository, DealsService],
  exports: [DealsService, DealsRepository],
})
export class DealsModule {}
