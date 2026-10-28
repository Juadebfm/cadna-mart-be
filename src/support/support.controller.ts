import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '@auth/decorators/public.decorator';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { SupportService } from './support.service';
import { CreateTicketDto, AddMessageDto } from './dto/ticket.dto';

@ApiTags('Support')
@ApiBearerAuth()
@Controller('support/tickets')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Public()
  @Post('/')
  async createTicket(
    @Body() dto: CreateTicketDto,
    @CurrentUser('userId') userId?: string,
  ): Promise<object> {
    return this.supportService.create(dto, userId);
  }

  @AccountTypes(AccountType.BUYER)
  @Post('/mine')
  async createBuyerTicket(
    @Body() dto: CreateTicketDto,
    @CurrentUser('userId') userId: string,
  ): Promise<object> {
    return this.supportService.create(dto, userId);
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER, AccountType.SUPPLIER)
  @Get('/')
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20, maximum: 50 })
  async listTickets(
    @CurrentUser('userId') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<object> {
    return this.supportService.findByUser(
      userId,
      Math.max(1, Number(page) || 1),
      Math.min(50, Math.max(1, Number(limit) || 20)),
    );
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER, AccountType.SUPPLIER)
  @Get('/:id')
  async getTicket(@Param('id') id: string, @CurrentUser('userId') userId: string): Promise<object> {
    return this.supportService.findByIdForUser(id, userId);
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER, AccountType.SUPPLIER)
  @Post('/:id/messages')
  async addMessage(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: AddMessageDto,
  ): Promise<object> {
    return this.supportService.addMessageForUser(id, dto, userId);
  }

  @AccountTypes(AccountType.BUYER)
  @Post('/:id/close')
  async closeTicket(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<object> {
    return this.supportService.closeForUser(id, userId);
  }
}
