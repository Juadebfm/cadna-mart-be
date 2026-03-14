import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { StoresRepository } from './stores.repository';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { AccountType } from '@users/enums/account-type.enum';

@Injectable()
export class StoresService {
  constructor(private readonly storesRepository: StoresRepository) {}

  async createStore(dto: CreateStoreDto, ownerId: string): Promise<object> {
    const existing = await this.storesRepository.findByOwner(ownerId);
    if (existing) {
      throw new ConflictException('You already have a store. A seller can only have one store.');
    }

    const slug =
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') +
      '-' +
      Date.now().toString(36);

    const store = await this.storesRepository.create({
      name: dto.name,
      slug,
      logoUrl: dto.logoUrl ?? null,
      location: dto.location ?? null,
      deliveryTimeRange: dto.deliveryTimeRange ?? null,
      owner: ownerId as any,
      isVerified: false,
      responseRatePercent: 0,
      averageRating: 0,
      reviewCount: 0,
      isActive: true,
      deletedAt: null,
    } as any);

    return this.toDto(store);
  }

  async getMyStore(ownerId: string): Promise<object> {
    const store = await this.storesRepository.findByOwner(ownerId);
    if (!store) throw new NotFoundException('You do not have a store yet');
    return this.toDto(store);
  }

  async updateMyStore(
    dto: UpdateStoreDto,
    currentUser: { userId: string; accountType: string },
    storeId?: string,
  ): Promise<object> {
    let store;
    if (storeId && currentUser.accountType === AccountType.ADMIN) {
      store = await this.storesRepository.findById(storeId);
    } else {
      store = await this.storesRepository.findByOwner(currentUser.userId);
    }

    if (!store) throw new NotFoundException('Store not found');

    if (currentUser.accountType !== AccountType.ADMIN) {
      const ownerId = (store as any).owner?.toString();
      if (ownerId !== currentUser.userId) throw new ForbiddenException('You do not own this store');
    }

    const id = (store as any)._id.toString();
    const updates: Record<string, unknown> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.logoUrl !== undefined) updates.logoUrl = dto.logoUrl;
    if (dto.location !== undefined) updates.location = dto.location;
    if (dto.deliveryTimeRange !== undefined) updates.deliveryTimeRange = dto.deliveryTimeRange;

    const updated = await this.storesRepository.update(id, updates as any);
    return this.toDto(updated!);
  }

  private toDto(store: any): object {
    return {
      id: store._id?.toString() ?? store.id,
      name: store.name,
      slug: store.slug,
      logoUrl: store.logoUrl,
      location: store.location,
      deliveryTimeRange: store.deliveryTimeRange,
      isVerified: store.isVerified,
      responseRatePercent: store.responseRatePercent,
      averageRating: store.averageRating,
      reviewCount: store.reviewCount,
      joinedYear: store.joinedYear,
      storeUrl: `/stores/${store.slug}`,
    };
  }

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
