import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '@auth/decorators/public.decorator';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { SupportService } from './support.service';
import { CreateTicketDto, AddMessageDto } from './dto/ticket.dto';

@ApiTags('Support & Notifications')
@ApiBearerAuth()
@Controller('support/tickets')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Public()
  @Post('/')
  async createTicket(
    @Body() dto: CreateTicketDto,
    @CurrentUser('id') userId?: string,
  ): Promise<object> {
    return this.supportService.create(dto, userId);
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER, AccountType.SUPPLIER)
  @Get('/')
  async listTickets(
    @CurrentUser('id') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<object> {
    return this.supportService.findByUser(userId, Number(page), Number(limit));
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER, AccountType.SUPPLIER)
  @Get('/:id')
  async getTicket(@Param('id') id: string): Promise<object> {
    return this.supportService.findById(id);
  }

  @AccountTypes(AccountType.BUYER, AccountType.SELLER, AccountType.SUPPLIER)
  @Post('/:id/messages')
  async addMessage(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddMessageDto,
  ): Promise<object> {
    return this.supportService.addMessage(id, dto, userId, 'user');
  }
}
