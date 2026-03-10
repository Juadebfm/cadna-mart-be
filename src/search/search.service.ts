import { Injectable } from '@nestjs/common';
import { ProductsRepository } from '@products/products.repository';

@Injectable()
export class SearchService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async suggest(q: string, limit: number) {
    if (!q || q.trim().length < 2) {
      return { items: [] };
    }

    const products = await this.productsRepository.searchSuggest(q.trim(), limit);
    return {
      items: products.map((p) => ({
        id: (p as unknown as { _id: { toString(): string } })._id.toString(),
        name: p.name,
        slug: p.slug,
        thumbnailUrl: p.thumbnailUrl,
        price: p.price,
        brand: p.brand,
      })),
    };
  }
}
