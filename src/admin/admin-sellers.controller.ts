import { Controller, Get, Patch, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { SellersService } from '@sellers/sellers.service';
import { SellersRepository } from '@sellers/sellers.repository';
import { UpdateSellerDto } from '@sellers/dto/update-seller.dto';
import { SellerProfile } from '@sellers/schemas/seller-profile.schema';
import { ParseObjectIdPipe } from '@common/pipes/parse-object-id.pipe';

@ApiTags('Admin — Sellers')
@ApiBearerAuth()
@AccountTypes(AccountType.ADMIN)
@Controller('admin/sellers')
export class AdminSellersController {
  constructor(
    private readonly sellersService: SellersService,
    private readonly sellersRepository: SellersRepository,
    @InjectModel(SellerProfile.name) private readonly sellerProfileModel: Model<SellerProfile>,
  ) {}

  @Get('applications')
  @ApiOperation({
    summary: 'List seller onboarding applications with profile, banking, and approval status',
  })
  async findApplications(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('approval') approval?: 'pending' | 'approved',
  ) {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (approval === 'pending') filter.isApproved = false;
    if (approval === 'approved') filter.isApproved = true;

    const skip = (+page - 1) * +limit;
    const [profiles, totalItems] = await Promise.all([
      this.sellerProfileModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(+limit)
        .populate('user', 'firstName lastName email accountType isVerified isActive')
        .lean()
        .exec(),
      this.sellerProfileModel.countDocuments(filter),
    ]);

    const ownerIds = profiles
      .map((profile: any) => (profile.user?._id ?? profile.user)?.toString())
      .filter(Boolean);

    const storefronts = await this.sellersRepository.sellerModel
      .find({ owner: { $in: ownerIds }, deletedAt: null })
      .select('owner name slug isVerified isActive')
      .lean()
      .exec();

    const storefrontMap = new Map(
      storefronts.map((storefront: any) => [
        (storefront.owner?._id ?? storefront.owner)?.toString(),
        storefront,
      ]),
    );

    const items = profiles.map((profile: any) => {
      const ownerId = (profile.user?._id ?? profile.user)?.toString();
      const storefront = ownerId ? storefrontMap.get(ownerId) : null;

      return {
        user: profile.user
          ? {
              id: ownerId,
              firstName: profile.user.firstName,
              lastName: profile.user.lastName,
              email: profile.user.email,
              accountType: profile.user.accountType,
              isVerified: profile.user.isVerified,
              isActive: profile.user.isActive,
            }
          : null,
        sellerProfile: {
          businessName: profile.businessName,
          businessRegistrationNumber: profile.businessRegistrationNumber,
          businessAddress: profile.businessAddress,
          businessType: profile.businessType,
          bankName: profile.bankName,
          bankAccountName: profile.bankAccountName,
          bankAccountNumberMasked: profile.bankAccountNumber
            ? `${'*'.repeat(Math.max(profile.bankAccountNumber.length - 4, 0))}${profile.bankAccountNumber.slice(-4)}`
            : null,
          bankDetailsCompletedAt: profile.bankDetailsCompletedAt,
          isApproved: profile.isApproved,
          approvedAt: profile.approvedAt,
          createdAt: profile.createdAt,
        },
        storefront: storefront
          ? {
              id: storefront._id?.toString?.() ?? storefront._id,
              name: storefront.name,
              slug: storefront.slug,
              isVerified: storefront.isVerified,
              isActive: storefront.isActive,
            }
          : null,
      };
    });

    return {
      items,
      pagination: {
        page: +page,
        limit: +limit,
        totalItems,
        totalPages: Math.ceil(totalItems / +limit),
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all sellers with profile and approval status' })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    const skip = (+page - 1) * +limit;
    const [items, totalItems] = await Promise.all([
      this.sellersRepository.sellerModel
        .find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(+limit)
        .populate('owner', 'firstName lastName email accountType isVerified isActive')
        .lean()
        .exec(),
      this.sellersRepository.sellerModel.countDocuments({ deletedAt: null }),
    ]);

    // Attach seller profiles (approval status, business details)
    const ownerIds = items.map((s: any) => s.owner?._id ?? s.owner);
    const profiles = await this.sellerProfileModel
      .find({ user: { $in: ownerIds } })
      .lean()
      .exec();

    const profileMap = new Map(profiles.map((p: any) => [p.user.toString(), p]));

    const enrichedItems = items.map((seller: any) => {
      const ownerId = (seller.owner?._id ?? seller.owner)?.toString();
      const profile = ownerId ? profileMap.get(ownerId) : null;
      return {
        ...seller,
        sellerProfile: profile
          ? {
              businessName: profile.businessName,
              businessRegistrationNumber: profile.businessRegistrationNumber,
              businessAddress: profile.businessAddress,
              businessType: profile.businessType,
              bankName: profile.bankName,
              isApproved: profile.isApproved,
              approvedAt: profile.approvedAt,
            }
          : null,
      };
    });

    return {
      items: enrichedItems,
      pagination: {
        page: +page,
        limit: +limit,
        totalItems,
        totalPages: Math.ceil(totalItems / +limit),
      },
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update any seller' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateSellerDto,
    @CurrentUser() user: { userId: string; accountType: string },
  ) {
    return this.sellersService.updateMySeller(dto, user, id);
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Toggle seller verified status' })
  async toggleVerify(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body('isVerified') isVerified: boolean,
  ) {
    return this.sellersRepository.update(id, { isVerified } as any);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a seller to upload products' })
  async approve(
    @Param('id', ParseObjectIdPipe) sellerId: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.approveSeller(sellerId, adminUserId);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a seller (spec-aligned POST alias of PATCH /:id/approve)' })
  async approvePost(
    @Param('id', ParseObjectIdPipe) sellerId: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.approveSeller(sellerId, adminUserId);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject / revoke seller approval' })
  async reject(@Param('id', ParseObjectIdPipe) sellerId: string) {
    return this.rejectSeller(sellerId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject seller (spec-aligned POST alias of PATCH /:id/reject)' })
  async rejectPost(@Param('id', ParseObjectIdPipe) sellerId: string) {
    return this.rejectSeller(sellerId);
  }

  @Patch('applications/:userId/approve')
  @ApiOperation({ summary: 'Approve a seller application by owner user id' })
  async approveApplication(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.approveSellerProfile(userId, adminUserId);
  }

  @Post('applications/:userId/approve')
  @ApiOperation({
    summary: 'Approve a seller application by owner user id (spec-aligned POST alias)',
  })
  async approveApplicationPost(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.approveSellerProfile(userId, adminUserId);
  }

  @Patch('applications/:userId/reject')
  @ApiOperation({ summary: 'Reject / revoke a seller application by owner user id' })
  async rejectApplication(@Param('userId', ParseObjectIdPipe) userId: string) {
    return this.rejectSellerProfile(userId);
  }

  @Post('applications/:userId/reject')
  @ApiOperation({
    summary: 'Reject / revoke a seller application by owner user id (spec-aligned POST alias)',
  })
  async rejectApplicationPost(@Param('userId', ParseObjectIdPipe) userId: string) {
    return this.rejectSellerProfile(userId);
  }

  private async approveSeller(sellerId: string, adminUserId: string) {
    const ownerUserId = await this.resolveSellerProfileUserId(sellerId);
    return this.approveSellerProfile(ownerUserId, adminUserId);
  }

  private async approveSellerProfile(userId: string, adminUserId: string) {
    const profile = await this.sellerProfileModel
      .findOneAndUpdate(
        { user: userId, deletedAt: null },
        { $set: { isApproved: true, approvedAt: new Date(), approvedBy: adminUserId } },
        { new: true },
      )
      .lean()
      .exec();

    if (!profile) {
      return { message: 'Seller profile not found' };
    }

    return { message: 'Seller approved', isApproved: true };
  }

  private async rejectSeller(sellerId: string) {
    const ownerUserId = await this.resolveSellerProfileUserId(sellerId);
    return this.rejectSellerProfile(ownerUserId);
  }

  private async rejectSellerProfile(userId: string) {
    const profile = await this.sellerProfileModel
      .findOneAndUpdate(
        { user: userId, deletedAt: null },
        { $set: { isApproved: false, approvedAt: null, approvedBy: null } },
        { new: true },
      )
      .lean()
      .exec();

    if (!profile) {
      return { message: 'Seller profile not found' };
    }

    return { message: 'Seller approval revoked', isApproved: false };
  }

  private async resolveSellerProfileUserId(subjectId: string) {
    const seller = await this.sellersRepository.findById(subjectId);
    const ownerId =
      (seller as any)?.owner?._id?.toString?.() ?? (seller as any)?.owner?.toString?.();
    return ownerId ?? subjectId;
  }
}
