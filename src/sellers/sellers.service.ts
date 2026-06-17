import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SellersRepository } from './sellers.repository';
import { CreateSellerDto } from './dto/create-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { BankingDetailsDto } from './dto/banking-details.dto';
import { AccountType } from '@users/enums/account-type.enum';
import { Product } from '@products/schemas/product.schema';
import { SellerProfile } from './schemas/seller-profile.schema';

@Injectable()
export class SellersService {
  constructor(
    private readonly sellersRepository: SellersRepository,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(SellerProfile.name) private readonly sellerProfileModel: Model<SellerProfile>,
  ) {}

  async createSeller(dto: CreateSellerDto, ownerId: string): Promise<object> {
    const existing = await this.sellersRepository.findByOwner(ownerId);
    if (existing) {
      throw new ConflictException('You already have a seller profile. A seller can only have one.');
    }

    const slug =
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') +
      '-' +
      Date.now().toString(36);

    const seller = await this.sellersRepository.create({
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
      followerCount: 0,
      isActive: true,
      deletedAt: null,
    } as any);

    return this.toDto(seller);
  }

  async getMySeller(ownerId: string): Promise<object> {
    const seller = await this.sellersRepository.findByOwner(ownerId);
    if (!seller) throw new NotFoundException('You do not have a seller profile yet');
    return this.toDto(seller);
  }

  async updateMySeller(
    dto: UpdateSellerDto,
    currentUser: { userId: string; accountType: string },
    sellerId?: string,
  ): Promise<object> {
    let seller;
    if (sellerId && currentUser.accountType === AccountType.ADMIN) {
      seller = await this.sellersRepository.findById(sellerId);
    } else {
      seller = await this.sellersRepository.findByOwner(currentUser.userId);
    }

    if (!seller) throw new NotFoundException('Seller not found');

    if (currentUser.accountType !== AccountType.ADMIN) {
      const ownerId = (seller as any).owner?.toString();
      if (ownerId !== currentUser.userId)
        throw new ForbiddenException('You do not own this seller profile');
    }

    const id = (seller as any)._id.toString();
    const updates: Record<string, unknown> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.logoUrl !== undefined) updates.logoUrl = dto.logoUrl;
    if (dto.location !== undefined) updates.location = dto.location;
    if (dto.deliveryTimeRange !== undefined) updates.deliveryTimeRange = dto.deliveryTimeRange;

    const updated = await this.sellersRepository.update(id, updates as any);
    return this.toDto(updated!);
  }

  private toDto(seller: any): object {
    return {
      id: seller._id?.toString() ?? seller.id,
      name: seller.name,
      slug: seller.slug,
      logoUrl: seller.logoUrl,
      location: seller.location,
      deliveryTimeRange: seller.deliveryTimeRange,
      isVerified: seller.isVerified,
      responseRatePercent: seller.responseRatePercent,
      averageRating: seller.averageRating,
      reviewCount: seller.reviewCount,
      followerCount: seller.followerCount,
      joinedYear: seller.joinedYear,
      sellerUrl: `/sellers/${seller.slug}`,
    };
  }

  async getSummary(sellerId: string) {
    const seller = await this.sellersRepository.findById(sellerId);
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const id = (seller as unknown as { _id: { toString(): string } })._id.toString();

    const [productStats] = await this.productModel.aggregate([
      { $match: { seller: (seller as any)._id, deletedAt: null, isActive: true } },
      {
        $group: {
          _id: null,
          productCount: { $sum: 1 },
          totalSales: { $sum: '$salesCount' },
        },
      },
    ]);

    return {
      id,
      name: seller.name,
      slug: seller.slug,
      isVerified: seller.isVerified,
      responseRatePercent: seller.responseRatePercent,
      averageRating: seller.averageRating,
      joinedYear: seller.joinedYear,
      reviewCount: seller.reviewCount,
      followerCount: seller.followerCount,
      logoUrl: seller.logoUrl,
      location: seller.location,
      deliveryTimeRange: seller.deliveryTimeRange,
      productCount: productStats?.productCount ?? 0,
      totalSales: productStats?.totalSales ?? 0,
      sellerUrl: `/sellers/${seller.slug}`,
    };
  }

  async getMyBankingDetails(userId: string): Promise<object> {
    const profile = await this.sellerProfileModel
      .findOne({ user: userId, deletedAt: null })
      .lean()
      .exec();
    if (!profile) {
      throw new NotFoundException('Seller profile not found');
    }
    return {
      bankName: profile.bankName,
      bankAccountNumber: profile.bankAccountNumber,
      bankAccountName: profile.bankAccountName,
      completedAt: profile.bankDetailsCompletedAt,
    };
  }

  async setMyBankingDetails(userId: string, dto: BankingDetailsDto): Promise<object> {
    const updated = await this.sellerProfileModel
      .findOneAndUpdate(
        { user: userId, deletedAt: null },
        {
          bankName: dto.bankName,
          bankAccountNumber: dto.bankAccountNumber,
          bankAccountName: dto.bankAccountName,
          bankDetailsCompletedAt: new Date(),
        },
        { new: true },
      )
      .lean()
      .exec();
    if (!updated) {
      throw new NotFoundException('Seller profile not found');
    }
    return {
      bankName: updated.bankName,
      bankAccountNumber: updated.bankAccountNumber,
      bankAccountName: updated.bankAccountName,
      completedAt: updated.bankDetailsCompletedAt,
    };
  }

  async followSeller(userId: string, sellerId: string): Promise<void> {
    const seller = await this.sellersRepository.findById(sellerId);
    if (!seller) throw new NotFoundException('Seller not found');

    try {
      await this.sellersRepository.follow(userId, sellerId);
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException('You are already following this seller');
      }
      throw err;
    }
  }

  async unfollowSeller(userId: string, sellerId: string): Promise<void> {
    const seller = await this.sellersRepository.findById(sellerId);
    if (!seller) throw new NotFoundException('Seller not found');

    const removed = await this.sellersRepository.unfollow(userId, sellerId);
    if (!removed) throw new NotFoundException('You are not following this seller');
  }
}
