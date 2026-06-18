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

@ApiTags('Admin')
@ApiBearerAuth()
@AccountTypes(AccountType.ADMIN)
@Controller('admin/sellers')
export class AdminSellersController {
  constructor(
    private readonly sellersService: SellersService,
    private readonly sellersRepository: SellersRepository,
    @InjectModel(SellerProfile.name) private readonly sellerProfileModel: Model<SellerProfile>,
  ) {}

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

  private async approveSeller(sellerId: string, adminUserId: string) {
    const profile = await this.sellerProfileModel
      .findOneAndUpdate(
        { user: sellerId },
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
    const profile = await this.sellerProfileModel
      .findOneAndUpdate(
        { user: sellerId },
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
}
