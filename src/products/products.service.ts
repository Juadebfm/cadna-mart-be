import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { ProductQueryDto } from './dto/product-query.dto';
import { CategoriesService } from '@categories/categories.service';
import { Product } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly categoriesService: CategoriesService,
  ) {}

  async findAll(query: ProductQueryDto) {
    let categoryIds: string[] | undefined;
    let subCategoryIds: string[] | undefined;

    if (query.category) {
      const cat = await this.categoriesService.findBySlug(query.category);
      if (cat) {
        categoryIds = [(cat as unknown as { _id: { toString(): string } })._id.toString()];
      }
    }

    if (query.subCategory) {
      const subCat = await this.categoriesService.findBySlug(query.subCategory);
      if (subCat) {
        subCategoryIds = [(subCat as unknown as { _id: { toString(): string } })._id.toString()];
      }
    }

    const { items, totalItems } = await this.productsRepository.findWithPagination(
      query,
      categoryIds,
      subCategoryIds,
    );

    const totalPages = Math.ceil(totalItems / query.limit);

    return {
      items: items.map((p) => this.toCard(p)),
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPrevPage: query.page > 1,
      },
    };
  }

  async findBySlug(slug: string, variantId?: string) {
    const product = await this.productsRepository.findBySlug(slug);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.toDetail(product, variantId);
  }

  async findRelated(productId: string, limit: number) {
    const items = await this.productsRepository.findRelated(productId, limit);
    return { items: items.map((p) => this.toCard(p)) };
  }

  async findBySection(section: string, limit: number): Promise<Product[]> {
    return this.productsRepository.findBySection(section, limit);
  }

  toCard(product: Product) {
    const id = (product as unknown as { _id: { toString(): string } })._id.toString();
    const store = product.store as unknown as {
      _id: { toString(): string };
      name: string;
      slug: string;
      isVerified: boolean;
    } | null;

    return {
      id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      thumbnailUrl: product.thumbnailUrl,
      price: product.price,
      originalPrice: product.originalPrice,
      discountPercent: product.discountPercent,
      rating: product.rating,
      reviewCount: product.reviewCount,
      inventoryStatus: product.inventoryStatus,
      badge: product.badge,
      store: store
        ? {
            id: store._id.toString(),
            name: store.name,
            isVerified: store.isVerified,
          }
        : null,
    };
  }

  private toDetail(product: Product, variantId?: string) {
    const id = (product as unknown as { _id: { toString(): string } })._id.toString();
    const store = product.store as unknown as {
      _id: { toString(): string };
      name: string;
      slug: string;
      isVerified: boolean;
      responseRatePercent: number;
      averageRating: number;
      joinedYear: number;
      reviewCount: number;
    } | null;

    return {
      id,
      slug: product.slug,
      sku: product.sku,
      name: product.name,
      brand: product.brand,
      breadcrumbs: product.breadcrumbs,
      rating: product.rating,
      reviewCount: product.reviewCount,
      price: product.price,
      originalPrice: product.originalPrice,
      discountPercent: product.discountPercent,
      savings: product.savings,
      gallery: product.gallery,
      variantAxes: product.variantAxes,
      variants: product.variants,
      defaultVariantId: product.defaultVariantId,
      selectedVariantId: variantId || product.defaultVariantId,
      descriptionHtml: product.descriptionHtml,
      specifications: product.specifications,
      store: store
        ? {
            id: store._id.toString(),
            name: store.name,
            isVerified: store.isVerified,
            responseRatePercent: store.responseRatePercent,
            rating: store.averageRating,
            joinedYear: store.joinedYear,
          }
        : null,
    };
  }
}
