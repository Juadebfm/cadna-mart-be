import { Controller, Get, Patch, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { SellersService } from '@sellers/sellers.service';
import { SellersRepository } from '@sellers/sellers.repository';
import { UpdateSellerDto } from '@sellers/dto/update-seller.dto';
import { PrismaService } from '@database/prisma.service';
import { ParsePublicIdPipe } from '@common/pipes/parse-public-id.pipe';

@ApiTags('Admin — Sellers')
@ApiBearerAuth()
@AccountTypes(AccountType.ADMIN)
@Controller('admin/sellers')
export class AdminSellersController {
  constructor(
    private readonly sellersService: SellersService,
    private readonly sellersRepository: SellersRepository,
    private readonly prisma: PrismaService,
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
    const where: any = { deletedAt: null };
    if (approval === 'pending') where.isApproved = false;
    if (approval === 'approved') where.isApproved = true;

    const skip = (+page - 1) * +limit;
    const [profiles, totalItems] = await Promise.all([
      this.prisma.sellerProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: +limit,
        include: { user: { include: { seller: true } } },
      }),
      this.prisma.sellerProfile.count({ where }),
    ]);

    const items = profiles.map((profile: any) => {
      const ownerId = profile.user?.id;
      const storefront = profile.user?.seller;

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
              id: storefront.id,
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
      this.prisma.seller.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: +limit,
        include: { owner: { include: { sellerProfile: true } } },
      }),
      this.prisma.seller.count({ where: { deletedAt: null } }),
    ]);

    const enrichedItems = items.map((seller: any) => {
      const profile = seller.owner?.sellerProfile;
      return {
        ...seller,
        _id: seller.id,
        owner: seller.owner ? { ...seller.owner, _id: seller.owner.id } : null,
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
    @Param('id', ParsePublicIdPipe) id: string,
    @Body() dto: UpdateSellerDto,
    @CurrentUser() user: { userId: string; accountType: string },
  ) {
    return this.sellersService.updateMySeller(dto, user, id);
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Toggle seller verified status' })
  async toggleVerify(
    @Param('id', ParsePublicIdPipe) id: string,
    @Body('isVerified') isVerified: boolean,
  ) {
    return this.sellersRepository.update(id, { isVerified } as any);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a seller to upload products' })
  async approve(
    @Param('id', ParsePublicIdPipe) sellerId: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.approveSeller(sellerId, adminUserId);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a seller (spec-aligned POST alias of PATCH /:id/approve)' })
  async approvePost(
    @Param('id', ParsePublicIdPipe) sellerId: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.approveSeller(sellerId, adminUserId);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject / revoke seller approval' })
  async reject(@Param('id', ParsePublicIdPipe) sellerId: string) {
    return this.rejectSeller(sellerId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject seller (spec-aligned POST alias of PATCH /:id/reject)' })
  async rejectPost(@Param('id', ParsePublicIdPipe) sellerId: string) {
    return this.rejectSeller(sellerId);
  }

  @Patch('applications/:userId/approve')
  @ApiOperation({ summary: 'Approve a seller application by owner user id' })
  async approveApplication(
    @Param('userId', ParsePublicIdPipe) userId: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.approveSellerProfile(userId, adminUserId);
  }

  @Post('applications/:userId/approve')
  @ApiOperation({
    summary: 'Approve a seller application by owner user id (spec-aligned POST alias)',
  })
  async approveApplicationPost(
    @Param('userId', ParsePublicIdPipe) userId: string,
    @CurrentUser('userId') adminUserId: string,
  ) {
    return this.approveSellerProfile(userId, adminUserId);
  }

  @Patch('applications/:userId/reject')
  @ApiOperation({ summary: 'Reject / revoke a seller application by owner user id' })
  async rejectApplication(@Param('userId', ParsePublicIdPipe) userId: string) {
    return this.rejectSellerProfile(userId);
  }

  @Post('applications/:userId/reject')
  @ApiOperation({
    summary: 'Reject / revoke a seller application by owner user id (spec-aligned POST alias)',
  })
  async rejectApplicationPost(@Param('userId', ParsePublicIdPipe) userId: string) {
    return this.rejectSellerProfile(userId);
  }

  private async approveSeller(sellerId: string, adminUserId: string) {
    const ownerUserId = await this.resolveSellerProfileUserId(sellerId);
    return this.approveSellerProfile(ownerUserId, adminUserId);
  }

  private async approveSellerProfile(userId: string, adminUserId: string) {
    const existing = await this.prisma.sellerProfile.findFirst({
      where: { userId, deletedAt: null },
    });
    const profile = existing
      ? await this.prisma.sellerProfile.update({
          where: { id: existing.id },
          data: { isApproved: true, approvedAt: new Date(), approvedById: adminUserId },
        })
      : null;

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
    const existing = await this.prisma.sellerProfile.findFirst({
      where: { userId, deletedAt: null },
    });
    const profile = existing
      ? await this.prisma.sellerProfile.update({
          where: { id: existing.id },
          data: { isApproved: false, approvedAt: null, approvedById: null },
        })
      : null;

    if (!profile) {
      return { message: 'Seller profile not found' };
    }

    return { message: 'Seller approval revoked', isApproved: false };
  }

  private async resolveSellerProfileUserId(subjectId: string) {
    const seller = await this.sellersRepository.findById(subjectId);
    const ownerId = (seller as any)?.owner?.toString?.();
    return ownerId ?? subjectId;
  }
}
