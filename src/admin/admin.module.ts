import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsModule } from '@products/products.module';
import { SellersModule } from '@sellers/sellers.module';
import { CategoriesModule } from '@categories/categories.module';
import { UsersModule } from '@users/users.module';
import { SellerProfile, SellerProfileSchema } from '@sellers/schemas/seller-profile.schema';
import { SiteConfig, SiteConfigSchema } from '@site-config/schemas/site-config.schema';
import { AdminProductsController } from './admin-products.controller';
import { AdminSellersController } from './admin-sellers.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminPricingController } from './admin-pricing.controller';
import { AdminPricingService } from './pricing/admin-pricing.service';
import { PricingRule, PricingRuleSchema } from './pricing/schemas/pricing-rule.schema';

@Module({
  imports: [
    ProductsModule,
    SellersModule,
    CategoriesModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: SellerProfile.name, schema: SellerProfileSchema },
      { name: PricingRule.name, schema: PricingRuleSchema },
      { name: SiteConfig.name, schema: SiteConfigSchema },
    ]),
  ],
  controllers: [
    AdminProductsController,
    AdminSellersController,
    AdminCategoriesController,
    AdminUsersController,
    AdminPricingController,
  ],
  providers: [AdminPricingService],
})
export class AdminModule {}
