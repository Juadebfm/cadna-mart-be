import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, SortOrder as MongoSortOrder } from 'mongoose';
import { Product } from './schemas/product.schema';
import { ProductQueryDto, ProductSortOption } from './dto/product-query.dto';

@Injectable()
export class ProductsRepository {
  constructor(@InjectModel(Product.name) public readonly productModel: Model<Product>) {}

  async findWithPagination(
    query: ProductQueryDto,
    categoryIds?: string[],
    subCategoryIds?: string[],
  ): Promise<{ items: Product[]; totalItems: number }> {
    const filter: FilterQuery<Product> = { deletedAt: null, isActive: true };

    if (query.q) {
      filter.$text = { $search: query.q };
    }

    if (query.section) {
      filter.sections = query.section;
    }

    if (categoryIds && categoryIds.length > 0) {
      filter.category = { $in: categoryIds };
    }

    if (subCategoryIds && subCategoryIds.length > 0) {
      filter.subCategory = { $in: subCategoryIds };
    }

    if (query.brand) {
      filter.brand = { $regex: new RegExp(query.brand, 'i') };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter['price.amount'] = {};
      if (query.minPrice !== undefined) filter['price.amount'].$gte = query.minPrice;
      if (query.maxPrice !== undefined) filter['price.amount'].$lte = query.maxPrice;
    }

    if (query.inStock) {
      filter.inventoryStatus = 'in_stock';
    }

    if (query.ratingGte !== undefined) {
      filter.rating = { $gte: query.ratingGte };
    }

    const sort = this.buildSort(query.sort);
    const skip = (query.page - 1) * query.limit;

    const [items, totalItems] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(query.limit)
        .populate('store', 'name slug isVerified location deliveryTimeRange')
        .lean()
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return { items: items as unknown as Product[], totalItems };
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return this.productModel
      .findOne({ slug, deletedAt: null, isActive: true })
      .populate(
        'store',
        'name slug logoUrl isVerified responseRatePercent averageRating joinedYear reviewCount location deliveryTimeRange',
      )
      .lean()
      .exec() as unknown as Promise<Product | null>;
  }

  async findById(id: string): Promise<Product | null> {
    return this.productModel
      .findOne({ _id: id, deletedAt: null })
      .lean()
      .exec() as unknown as Promise<Product | null>;
  }

  async findBySection(section: string, limit: number): Promise<Product[]> {
    return this.productModel
      .find({ deletedAt: null, isActive: true, sections: section })
      .sort({ salesCount: -1, createdAt: -1 })
      .limit(limit)
      .populate('store', 'name slug isVerified location deliveryTimeRange')
      .lean()
      .exec() as unknown as Promise<Product[]>;
  }

  async findRelated(productId: string, limit: number): Promise<Product[]> {
    const product = await this.findById(productId);
    if (!product) return [];

    return this.productModel
      .find({
        _id: { $ne: productId },
        deletedAt: null,
        isActive: true,
        $or: [{ category: product.category }, { brand: product.brand }],
      })
      .sort({ salesCount: -1 })
      .limit(limit)
      .populate('store', 'name slug isVerified location deliveryTimeRange')
      .lean()
      .exec() as unknown as Promise<Product[]>;
  }

  async searchSuggest(q: string, limit: number): Promise<Product[]> {
    return this.productModel
      .find({
        deletedAt: null,
        isActive: true,
        name: { $regex: new RegExp(q, 'i') },
      })
      .select('name slug thumbnailUrl price brand')
      .limit(limit)
      .lean()
      .exec() as unknown as Promise<Product[]>;
  }

  async create(data: Partial<Product>): Promise<Product> {
    const product = new this.productModel(data);
    return product.save() as unknown as Product;
  }

  async update(id: string, data: Partial<Product>): Promise<Product | null> {
    return this.productModel
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec() as unknown as Promise<Product | null>;
  }

  async softDelete(id: string): Promise<void> {
    await this.productModel.updateOne(
      { _id: id },
      { $set: { deletedAt: new Date(), isActive: false } },
    );
  }

  async findByIdWithStoreOwner(id: string): Promise<Product | null> {
    return this.productModel
      .findOne({ _id: id, deletedAt: null })
      .populate('store', 'owner')
      .lean()
      .exec() as unknown as Promise<Product | null>;
  }

  async findAllAdmin(
    page: number,
    limit: number,
    includeInactive = true,
  ): Promise<{ items: Product[]; totalItems: number }> {
    const filter = includeInactive ? {} : { deletedAt: null, isActive: true };
    const skip = (page - 1) * limit;
    const [items, totalItems] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('store', 'name slug')
        .lean()
        .exec(),
      this.productModel.countDocuments(filter),
    ]);
    return { items: items as unknown as Product[], totalItems };
  }

  private buildSort(sortOption: ProductSortOption): Record<string, MongoSortOrder> {
    switch (sortOption) {
      case ProductSortOption.PRICE_ASC:
        return { 'price.amount': 1 };
      case ProductSortOption.PRICE_DESC:
        return { 'price.amount': -1 };
      case ProductSortOption.NEWEST:
        return { createdAt: -1 };
      case ProductSortOption.POPULAR:
        return { salesCount: -1 };
      case ProductSortOption.DISCOUNT:
        return { discountPercent: -1 };
      case ProductSortOption.RELEVANCE:
      default:
        return { salesCount: -1, createdAt: -1 };
    }
  }
}
