import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsModule } from '@products/products.module';
import { SellersModule } from '@sellers/sellers.module';
import { CategoriesModule } from '@categories/categories.module';
import { UsersModule } from '@users/users.module';
import { OrdersModule } from '@orders/orders.module';
import { ReturnsModule } from '@returns/returns.module';
import { SiteConfigModule } from '@site-config/site-config.module';
import { SellerProfile, SellerProfileSchema } from '@sellers/schemas/seller-profile.schema';
import { SiteConfig, SiteConfigSchema } from '@site-config/schemas/site-config.schema';
import { Order, OrderSchema } from '@orders/schemas/order.schema';
import { DataRequest, DataRequestSchema } from '@data-requests/schemas/data-request.schema';
import { AdminProductsController } from './admin-products.controller';
import { AdminSellersController } from './admin-sellers.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminPricingController } from './admin-pricing.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminDeliveryController } from './admin-delivery.controller';
import { AdminReportingController } from './admin-reporting.controller';
import { AdminComplianceController } from './admin-compliance.controller';
import { AdminPricingService } from './pricing/admin-pricing.service';
import { PricingRule, PricingRuleSchema } from './pricing/schemas/pricing-rule.schema';

@Module({
  imports: [
    ProductsModule,
    SellersModule,
    CategoriesModule,
    UsersModule,
    OrdersModule,
    ReturnsModule,
    SiteConfigModule,
    MongooseModule.forFeature([
      { name: SellerProfile.name, schema: SellerProfileSchema },
      { name: PricingRule.name, schema: PricingRuleSchema },
      { name: SiteConfig.name, schema: SiteConfigSchema },
      { name: Order.name, schema: OrderSchema },
      { name: DataRequest.name, schema: DataRequestSchema },
    ]),
  ],
  controllers: [
    AdminProductsController,
    AdminSellersController,
    AdminCategoriesController,
    AdminUsersController,
    AdminPricingController,
    AdminOrdersController,
    AdminDeliveryController,
    AdminReportingController,
    AdminComplianceController,
  ],
  providers: [AdminPricingService],
})
export class AdminModule {}
