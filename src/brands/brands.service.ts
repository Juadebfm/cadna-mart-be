import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from '@products/schemas/product.schema';

@Injectable()
export class BrandsService {
  constructor(@InjectModel(Product.name) private readonly productModel: Model<Product>) {}

  async list(): Promise<{ items: Array<{ name: string; productCount: number }> }> {
    const rows = await this.productModel.aggregate<{ _id: string; count: number }>([
      { $match: { deletedAt: null, isActive: true, brand: { $nin: [null, ''] } } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]);

    return {
      items: rows.map((r) => ({ name: r._id, productCount: r.count })),
    };
  }
}
