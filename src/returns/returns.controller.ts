import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { AddEvidenceDto } from './dto/evidence.dto';

@ApiTags('Fulfilment')
@ApiBearerAuth()
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @AccountTypes(AccountType.BUYER, AccountType.SELLER)
  @Post('/')
  async createReturn(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReturnDto,
  ): Promise<object> {
    return this.returnsService.create(userId, dto);
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER)
  @Get('/')
  async listReturns(
    @CurrentUser('id') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<object> {
    return this.returnsService.findByUser(userId, Number(page), Number(limit));
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER)
  @Get('/eligibility/:orderItemId')
  checkEligibility(@Param('orderItemId') orderItemId: string): object {
    return this.returnsService.checkEligibility(orderItemId);
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER)
  @Get('/:id')
  async getReturn(@Param('id') id: string, @CurrentUser('id') userId: string): Promise<object> {
    return this.returnsService.findById(id, userId);
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER)
  @Patch('/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelReturn(@Param('id') id: string, @CurrentUser('id') userId: string): Promise<object> {
    return this.returnsService.cancel(id, userId);
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER)
  @Post('/:id/evidence')
  async addEvidence(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddEvidenceDto,
  ): Promise<object> {
    return this.returnsService.addEvidence(id, userId, dto.urls);
  }
}
