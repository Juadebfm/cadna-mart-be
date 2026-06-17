import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductPolicy, ProductPolicySchema } from './schemas/product-policy.schema';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: ProductPolicy.name, schema: ProductPolicySchema }])],
  controllers: [PoliciesController],
  providers: [PoliciesService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
