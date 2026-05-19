import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductsRepository } from './products.repository';
import { ProductQueryDto } from './dto/product-query.dto';
import { CategoriesService } from '@categories/categories.service';
import { Product } from './schemas/product.schema';
import { SellerProfile } from '@sellers/schemas/seller-profile.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AccountType } from '@users/enums/account-type.enum';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly categoriesService: CategoriesService,
    @InjectModel(SellerProfile.name) private readonly sellerProfileModel: Model<SellerProfile>,
  ) {}

  async findAll(query: ProductQueryDto) {
    const resolvedQuery: ProductQueryDto = { ...query };
    let categoryIds: string[] | undefined;
    let subCategoryIds: string[] | undefined;

    if (query.category) {
      const cat = await this.categoriesService.findBySlug(query.category);
      if (cat) {
        // "deals" is a promotional rail that spans all categories.
        if (cat.slug === 'deals') {
          resolvedQuery.section = 'best_deals';
        } else {
          categoryIds = [(cat as unknown as { _id: { toString(): string } })._id.toString()];
        }
      }
    }

    if (query.subCategory && query.category !== 'deals') {
      const subCat = await this.categoriesService.findBySlug(query.subCategory);
      if (subCat) {
        subCategoryIds = [(subCat as unknown as { _id: { toString(): string } })._id.toString()];
      }
    }

    const { items, totalItems } = await this.productsRepository.findWithPagination(
      resolvedQuery,
      categoryIds,
      subCategoryIds,
    );

    const totalPages = Math.ceil(totalItems / resolvedQuery.limit);

    return {
      items: items.map((p) => this.toCard(p)),
      pagination: {
        page: resolvedQuery.page,
        limit: resolvedQuery.limit,
        totalItems,
        totalPages,
        hasNextPage: resolvedQuery.page < totalPages,
        hasPrevPage: resolvedQuery.page > 1,
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

  async findByIdOrSlug(idOrSlug: string, variantId?: string) {
    const isObjectId = /^[a-f\d]{24}$/i.test(idOrSlug);
    const product = isObjectId
      ? await this.productsRepository.findById(idOrSlug)
      : await this.productsRepository.findBySlug(idOrSlug);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.toDetail(product, variantId);
  }

  async getVariants(idOrSlug: string) {
    const isObjectId = /^[a-f\d]{24}$/i.test(idOrSlug);
    const product = isObjectId
      ? await this.productsRepository.findById(idOrSlug)
      : await this.productsRepository.findBySlug(idOrSlug);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return {
      productId: (product as unknown as { _id: { toString(): string } })._id.toString(),
      variantAxes: product.variantAxes,
      variants: product.variants,
      defaultVariantId: product.defaultVariantId,
    };
  }

  async getAvailability(idOrSlug: string) {
    const isObjectId = /^[a-f\d]{24}$/i.test(idOrSlug);
    const product = isObjectId
      ? await this.productsRepository.findById(idOrSlug)
      : await this.productsRepository.findBySlug(idOrSlug);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    const variantSummaries = product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      inStock: v.isInStock,
      stockQty: v.stockQty,
    }));
    const anyVariantInStock = variantSummaries.some((v) => v.inStock && v.stockQty > 0);
    const productInStock =
      product.inventoryStatus === 'in_stock' &&
      (variantSummaries.length === 0 || anyVariantInStock);
    return {
      productId: (product as unknown as { _id: { toString(): string } })._id.toString(),
      productInStock,
      inventoryStatus: product.inventoryStatus,
      variants: variantSummaries,
    };
  }

  async findRelated(productId: string, limit: number) {
    const items = await this.productsRepository.findRelated(productId, limit);
    return { items: items.map((p) => this.toCard(p)) };
  }

  async findBySection(section: string, limit: number): Promise<Product[]> {
    return this.productsRepository.findBySection(section, limit);
  }

  async findBySeller(sellerSlug: string, query: ProductQueryDto) {
    const seller = await this.productsRepository.productModel.db
      .collection('stores')
      .findOne({ slug: sellerSlug, deletedAt: null });

    if (!seller) throw new NotFoundException('Seller not found');

    const sellerId = seller._id.toString();
    const { items, totalItems } = await this.productsRepository.findBySellerWithPagination(
      sellerId,
      query,
    );

    const totalPages = Math.ceil(totalItems / query.limit);

    return {
      seller: {
        id: sellerId,
        name: seller.name,
        slug: seller.slug,
        logoUrl: seller.logoUrl ?? null,
        isVerified: seller.isVerified ?? false,
      },
      items: items.map((p: Product) => this.toCard(p)),
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

  private toMoney(amount: number) {
    return {
      amount,
      currency: 'NGN',
      formatted: `₦${amount.toLocaleString('en-NG')}`,
    };
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async createProduct(dto: CreateProductDto, currentUser: { userId: string; accountType: string }) {
    // Check seller approval before allowing product creation
    if (currentUser.accountType === AccountType.SELLER) {
      const profile = await this.sellerProfileModel
        .findOne({ user: currentUser.userId })
        .lean()
        .exec();
      if (!profile || !(profile as any).isApproved) {
        throw new ForbiddenException(
          'Your seller account is pending approval. You cannot upload products yet.',
        );
      }
    }

    const { priceAmount, originalPriceAmount } = dto;

    const discountPercent =
      dto.discountPercent ??
      (originalPriceAmount && originalPriceAmount > priceAmount
        ? Math.round(((originalPriceAmount - priceAmount) / originalPriceAmount) * 100)
        : 0);

    const savings =
      originalPriceAmount && originalPriceAmount > priceAmount
        ? this.toMoney(originalPriceAmount - priceAmount)
        : null;

    const variants = (dto.variants ?? []).map((v) => ({
      id: v.id,
      sku: v.sku,
      attributes: v.attributes,
      price: this.toMoney(v.priceAmount),
      stockQty: v.stockQty ?? 0,
      isInStock: v.isInStock ?? (v.stockQty ?? 0) > 0,
      images: v.images ?? [],
    }));

    const baseSlug = this.slugify(dto.name);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const product = await this.productsRepository.create({
      name: dto.name,
      slug,
      sku: dto.sku ?? null,
      brand: dto.brand ?? null,
      thumbnailUrl: dto.thumbnailUrl ?? null,
      price: this.toMoney(priceAmount),
      originalPrice: originalPriceAmount ? this.toMoney(originalPriceAmount) : null,
      discountPercent,
      savings,
      gallery: dto.gallery ?? [],
      variantAxes: dto.variantAxes ?? [],
      variants,
      defaultVariantId: dto.defaultVariantId ?? variants[0]?.id ?? null,
      descriptionHtml: dto.descriptionHtml ?? null,
      tabs: dto.tabs ?? [],
      specifications: dto.specifications ?? [],
      breadcrumbs: dto.breadcrumbs ?? [],
      badge: dto.badge ?? null,
      sections: dto.sections ?? [],
      inventoryStatus: dto.inventoryStatus ?? 'in_stock',
      isActive: dto.isActive ?? true,
      seller: dto.sellerId as any,
      category: (dto.categoryId as any) ?? null,
      subCategory: (dto.subCategoryId as any) ?? null,
      returnPolicy: dto.returnPolicy ?? null,
      rating: 0,
      reviewCount: 0,
      salesCount: 0,
      deletedAt: null,
    } as any);

    return this.toCard(product as any);
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    currentUser: { userId: string; accountType: string },
  ) {
    const product = await this.productsRepository.findByIdWithSellerOwner(id);
    if (!product) throw new NotFoundException('Product not found');

    if (currentUser.accountType !== AccountType.ADMIN) {
      const sellerOwner = (product.seller as any)?.owner?.toString();
      if (sellerOwner !== currentUser.userId) {
        throw new ForbiddenException('You do not own this product');
      }
    }

    const updates: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      updates.name = dto.name;
    }
    if (dto.brand !== undefined) updates.brand = dto.brand;
    if (dto.sku !== undefined) updates.sku = dto.sku;
    if (dto.thumbnailUrl !== undefined) updates.thumbnailUrl = dto.thumbnailUrl;
    if (dto.descriptionHtml !== undefined) updates.descriptionHtml = dto.descriptionHtml;
    if (dto.badge !== undefined) updates.badge = dto.badge;
    if (dto.sections !== undefined) updates.sections = dto.sections;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;
    if (dto.inventoryStatus !== undefined) updates.inventoryStatus = dto.inventoryStatus;
    if (dto.gallery !== undefined) updates.gallery = dto.gallery;
    if (dto.variantAxes !== undefined) updates.variantAxes = dto.variantAxes;
    if (dto.tabs !== undefined) updates.tabs = dto.tabs;
    if (dto.specifications !== undefined) updates.specifications = dto.specifications;
    if (dto.breadcrumbs !== undefined) updates.breadcrumbs = dto.breadcrumbs;
    if (dto.categoryId !== undefined) updates.category = dto.categoryId;
    if (dto.subCategoryId !== undefined) updates.subCategory = dto.subCategoryId;
    if (dto.defaultVariantId !== undefined) updates.defaultVariantId = dto.defaultVariantId;
    if (dto.returnPolicy !== undefined) updates.returnPolicy = dto.returnPolicy;

    if (dto.priceAmount !== undefined) updates.price = this.toMoney(dto.priceAmount);
    if (dto.originalPriceAmount !== undefined) {
      updates.originalPrice = this.toMoney(dto.originalPriceAmount);
      if (dto.priceAmount !== undefined && dto.originalPriceAmount > dto.priceAmount) {
        updates.savings = this.toMoney(dto.originalPriceAmount - dto.priceAmount);
        updates.discountPercent = Math.round(
          ((dto.originalPriceAmount - dto.priceAmount) / dto.originalPriceAmount) * 100,
        );
      }
    }
    if (dto.discountPercent !== undefined) updates.discountPercent = dto.discountPercent;

    if (dto.variants !== undefined) {
      updates.variants = dto.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        attributes: v.attributes,
        price: this.toMoney(v.priceAmount),
        stockQty: v.stockQty ?? 0,
        isInStock: v.isInStock ?? (v.stockQty ?? 0) > 0,
        images: v.images ?? [],
      }));
    }

    const updated = await this.productsRepository.update(id, updates as any);
    if (!updated) throw new NotFoundException('Product not found');
    return this.toCard(updated as any);
  }

  async removeProduct(
    id: string,
    currentUser: { userId: string; accountType: string },
  ): Promise<void> {
    const product = await this.productsRepository.findByIdWithSellerOwner(id);
    if (!product) throw new NotFoundException('Product not found');

    if (currentUser.accountType !== AccountType.ADMIN) {
      const sellerOwner = (product.seller as any)?.owner?.toString();
      if (sellerOwner !== currentUser.userId) {
        throw new ForbiddenException('You do not own this product');
      }
    }

    await this.productsRepository.softDelete(id);
  }

  toCard(product: Product) {
    const id = (product as unknown as { _id: { toString(): string } })._id.toString();
    const seller = product.seller as unknown as {
      _id: { toString(): string };
      name: string;
      slug: string;
      isVerified: boolean;
      location: string | null;
      deliveryTimeRange: string | null;
    } | null;

    return {
      id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      thumbnailUrl: product.thumbnailUrl,
      price: product.price,
      originalPrice: product.originalPrice,
      savings: product.savings,
      discountPercent: product.discountPercent,
      rating: product.rating,
      reviewCount: product.reviewCount,
      inventoryStatus: product.inventoryStatus,
      badge: product.badge,
      seller: seller
        ? {
            id: seller._id.toString(),
            name: seller.name,
            isVerified: seller.isVerified,
            location: seller.location,
            deliveryTimeRange: seller.deliveryTimeRange,
          }
        : null,
    };
  }

  private toDetail(product: Product, variantId?: string) {
    const id = (product as unknown as { _id: { toString(): string } })._id.toString();
    const seller = product.seller as unknown as {
      _id: { toString(): string };
      name: string;
      slug: string;
      logoUrl: string | null;
      isVerified: boolean;
      responseRatePercent: number;
      averageRating: number;
      joinedYear: number;
      reviewCount: number;
      followerCount: number;
      location: string | null;
      deliveryTimeRange: string | null;
    } | null;
    const selectedVariantId = this.resolveSelectedVariantId(product, variantId);
    const selectedVariant =
      product.variants.find((variant) => variant.id === selectedVariantId) ?? null;

    return {
      id,
      slug: product.slug,
      sku: product.sku,
      productCode: product.sku,
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
      selectedVariantId,
      selectedVariant,
      inventoryStatus: product.inventoryStatus,
      badge: product.badge,
      descriptionHtml: product.descriptionHtml,
      tabs: product.tabs,
      specifications: product.specifications,
      returnPolicy: product.returnPolicy,
      seller: seller
        ? {
            id: seller._id.toString(),
            name: seller.name,
            logoUrl: seller.logoUrl ?? null,
            isVerified: seller.isVerified,
            responseRatePercent: seller.responseRatePercent,
            rating: seller.averageRating,
            joinedYear: seller.joinedYear,
            reviewCount: seller.reviewCount,
            followerCount: seller.followerCount,
            location: seller.location ?? null,
            deliveryTimeRange: seller.deliveryTimeRange ?? null,
            sellerUrl: `/sellers/${seller.slug}`,
          }
        : null,
    };
  }

  private resolveSelectedVariantId(product: Product, preferredVariantId?: string): string | null {
    if (
      preferredVariantId &&
      product.variants.some((variant) => variant.id === preferredVariantId)
    ) {
      return preferredVariantId;
    }

    if (
      product.defaultVariantId &&
      product.variants.some((variant) => variant.id === product.defaultVariantId)
    ) {
      return product.defaultVariantId;
    }

    return product.variants[0]?.id ?? null;
  }
}
