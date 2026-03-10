import { Injectable, NotFoundException } from '@nestjs/common';
import { StoresRepository } from './stores.repository';

@Injectable()
export class StoresService {
  constructor(private readonly storesRepository: StoresRepository) {}

  async getSummary(storeId: string) {
    const store = await this.storesRepository.findById(storeId);
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const id = (store as unknown as { _id: { toString(): string } })._id.toString();
    return {
      id,
      name: store.name,
      isVerified: store.isVerified,
      responseRatePercent: store.responseRatePercent,
      averageRating: store.averageRating,
      joinedYear: store.joinedYear,
      reviewCount: store.reviewCount,
      logoUrl: store.logoUrl,
      storeUrl: `/stores/${store.slug}`,
    };
  }
}
