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
import { OnboardSellerDto } from './dto/onboard-seller.dto';
import { AccountType } from '@users/enums/account-type.enum';
import { Product } from '@products/schemas/product.schema';
import { Seller } from './schemas/seller.schema';
import { SellerProfile } from './schemas/seller-profile.schema';
import { UsersService } from '@users/users.service';
import { OtpService } from '@otp/otp.service';
import { OtpType } from '@otp/enums/otp-type.enum';
import { EmailService } from '@email/email.service';
import { ConfigService } from '@config/config.service';
import { ProductsService } from '@products/products.service';

@Injectable()
export class SellersService {
  constructor(
    private readonly sellersRepository: SellersRepository,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(SellerProfile.name) private readonly sellerProfileModel: Model<SellerProfile>,
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly productsService: ProductsService,
  ) {}

  async onboardPublic(dto: OnboardSellerDto): Promise<{ message: string }> {
    const existing = await this.usersService.findByEmail(dto.email).catch(() => null);
    if (existing) throw new ConflictException('An account with this email already exists');

    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      accountType: AccountType.SELLER,
      phoneNumber: dto.phoneNumber,
      termsAccepted: dto.termsAccepted,
    });

    const userId = (user as unknown as { _id: { toString(): string } })._id.toString();

    await this.sellerProfileModel.create({
      user: userId,
      businessName: dto.businessName,
      businessRegistrationNumber: dto.businessRegistrationNumber ?? null,
      businessAddress: dto.businessAddress,
      businessType: dto.businessType,
      bankName: null,
      bankAccountNumber: null,
      bankAccountName: null,
      bankDetailsCompletedAt: null,
      isApproved: false,
    });

    const code = await this.otpService.generateAndStore(dto.email, OtpType.EMAIL_VERIFICATION);
    await Promise.all([
      this.emailService.sendVerificationCode(dto.email, code),
      this.emailService.sendSellerWelcome(dto.email, dto.firstName, dto.businessName),
      this.emailService.sendAdminNewSellerAlert(
        this.configService.email.fromAddress,
        dto.email,
        dto.businessName,
      ),
    ]);

    return { message: 'Seller account created. Please verify your email to continue.' };
  }

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

  async getMyOnboardingStatus(userId: string): Promise<object> {
    const [user, profile, storefront] = await Promise.all([
      this.usersService.findById(userId),
      this.sellerProfileModel.findOne({ user: userId, deletedAt: null }).lean().exec(),
      this.sellersRepository.findByOwner(userId),
    ]);

    if (!profile) {
      throw new NotFoundException('Seller profile not found');
    }

    const bankingSubmitted = !!(
      profile.bankName &&
      profile.bankAccountName &&
      profile.bankAccountNumber &&
      profile.bankDetailsCompletedAt
    );

    const maskedAccountNumber = profile.bankAccountNumber
      ? `${'*'.repeat(Math.max(profile.bankAccountNumber.length - 4, 0))}${profile.bankAccountNumber.slice(-4)}`
      : null;

    const nextStep = !user.isVerified
      ? 'verify_email'
      : !bankingSubmitted
        ? 'submit_banking'
        : !profile.isApproved
          ? 'await_approval'
          : !storefront
            ? 'create_storefront'
            : 'ready';

    return {
      account: {
        email: user.email,
        accountType: user.accountType,
        isEmailVerified: user.isVerified,
      },
      profile: {
        businessName: profile.businessName,
        businessRegistrationNumber: profile.businessRegistrationNumber,
        businessAddress: profile.businessAddress,
        businessType: profile.businessType,
      },
      banking: {
        isSubmitted: bankingSubmitted,
        completedAt: profile.bankDetailsCompletedAt,
        bankName: profile.bankName,
        bankAccountName: profile.bankAccountName,
        bankAccountNumberMasked: maskedAccountNumber,
      },
      approval: {
        isApproved: profile.isApproved,
        approvedAt: profile.approvedAt,
      },
      storefront: storefront
        ? {
            exists: true,
            id: (storefront as unknown as { _id: { toString(): string } })._id.toString(),
            name: storefront.name,
            slug: storefront.slug,
          }
        : {
            exists: false,
            id: null,
            name: null,
            slug: null,
          },
      nextStep,
    };
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

  async getFollowedSellers(userId: string, page = 1, limit = 20): Promise<object> {
    const { items, totalItems } = await this.sellersRepository.findFollowedByUser(
      userId,
      page,
      limit,
    );
    const sellers = await Promise.all(
      items.map(async (entry) => {
        const seller = entry.seller as unknown as Seller;
        if (!seller || seller.deletedAt) return null;
        const id = (seller as unknown as { _id: { toString(): string } })._id.toString();
        const products = await this.productModel
          .find({ seller: id, deletedAt: null, isActive: true })
          .sort({ createdAt: -1 })
          .limit(4)
          .lean()
          .exec();
        return {
          ...(await this.getSummary(id)),
          products: products.map((product) =>
            this.productsService.toCard(product as unknown as Product),
          ),
        };
      }),
    );
    const visible = sellers.filter((seller) => seller !== null);
    return {
      items: visible,
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    };
  }
}
