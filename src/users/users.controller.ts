import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MarketingConsentDto, DataDeleteRequestDto } from './dto/marketing-consent.dto';
import { ParseObjectIdPipe } from '@common/pipes/parse-object-id.pipe';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from './enums/account-type.enum';
import { AddressesService } from '@addresses/addresses.service';
import { DataRequestsService } from '@data-requests/data-requests.service';
import { DataRequestKind } from '@data-requests/schemas/data-request.schema';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly addressesService: AddressesService,
    private readonly dataRequestsService: DataRequestsService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get the current user profile' })
  async getProfile(@CurrentUser('userId') userId: string) {
    const user = await this.usersService.findById(userId);
    return this.usersService.toPublicUser(user);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update the current user profile' })
  async updateProfile(@CurrentUser('userId') userId: string, @Body() dto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(userId, dto);
    return this.usersService.toPublicUser(user);
  }

  @Post('consent/marketing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set marketing consent (NDPR)' })
  async setMarketingConsent(
    @CurrentUser('userId') userId: string,
    @Body() dto: MarketingConsentDto,
  ) {
    const user = await this.usersService.setMarketingConsent(userId, dto.optIn);
    return {
      marketingConsent: !!user.marketingConsentAt,
      marketingConsentAt: user.marketingConsentAt,
    };
  }

  @Post('data/delete-request')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Submit right-to-be-forgotten request (NDPR)' })
  async requestDeletion(@CurrentUser('userId') userId: string, @Body() dto: DataDeleteRequestDto) {
    const record = await this.dataRequestsService.create(
      userId,
      DataRequestKind.DELETE,
      dto.reason,
    );
    return {
      id: (record as unknown as { _id: { toString(): string } })._id.toString(),
      status: record.status,
      submittedAt: record.createdAt,
    };
  }

  @Get('data/export')
  @ApiOperation({ summary: 'Export the current user data (NDPR)' })
  async exportData(@CurrentUser('userId') userId: string) {
    const user = await this.usersService.findById(userId);
    const addresses = await this.addressesService.list(userId);
    await this.dataRequestsService.create(userId, DataRequestKind.EXPORT);
    return {
      generatedAt: new Date().toISOString(),
      user: this.usersService.toPublicUser(user),
      addresses,
    };
  }

  @Post()
  @AccountTypes(AccountType.ADMIN)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @AccountTypes(AccountType.ADMIN)
  @ApiOperation({ summary: 'Get all users with pagination (Admin only)' })
  async findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @AccountTypes(AccountType.ADMIN)
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @AccountTypes(AccountType.ADMIN)
  @ApiOperation({ summary: 'Update user' })
  async update(@Param('id', ParseObjectIdPipe) id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @AccountTypes(AccountType.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete user (Admin only)' })
  async remove(@Param('id', ParseObjectIdPipe) id: string) {
    await this.usersService.remove(id);
  }
}
