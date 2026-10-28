import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from '@products/schemas/product.schema';
import { ProductsService } from '@products/products.service';
import { RecentlyViewedRepository } from './recently-viewed.repository';

@Injectable()
export class RecentlyViewedService {
  constructor(
    private readonly repository: RecentlyViewedRepository,
    private readonly productsService: ProductsService,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  async record(userId: string, productId: string) {
    const product = await this.productModel
      .findOne({ _id: productId, deletedAt: null, isActive: true })
      .select('_id')
      .lean()
      .exec();
    if (!product) throw new NotFoundException('Product not found');
    await this.repository.record(userId, productId);
    return { recorded: true };
  }

  async list(userId: string, page: number, limit: number) {
    const { items, totalItems } = await this.repository.findByUser(userId, page, limit);
    const visible = items
      .filter((item) => item.product)
      .map((item) => {
        const product = item.product as unknown as Product;
        return {
          productId: (product as unknown as { _id: { toString(): string } })._id.toString(),
          viewedAt: item.viewedAt,
          product: this.productsService.toCard(product),
        };
      });
    return {
      items: visible,
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    };
  }
}
