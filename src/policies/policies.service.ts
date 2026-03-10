import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductPolicy } from './schemas/product-policy.schema';

@Injectable()
export class PoliciesService {
  constructor(
    @InjectModel(ProductPolicy.name) private readonly policyModel: Model<ProductPolicy>,
  ) {}

  async getProductPolicy(productId: string) {
    const policy = await this.policyModel
      .findOne({ product: productId })
      .lean()
      .exec();

    if (!policy) {
      return {
        returnPolicy: {
          title: 'Return Policy',
          summary: 'Free return within 7 days for eligible items',
          detailsUrl: '/policies/returns',
        },
        warrantyPolicy: {
          title: 'Warranty',
          summary: 'Warranty information unavailable for this product',
          detailsUrl: null,
        },
      };
    }

    return {
      returnPolicy: policy.returnPolicy,
      warrantyPolicy: policy.warrantyPolicy,
    };
  }
}
