import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketCategory } from '../schemas/support-ticket.schema';

export class CreateTicketDto {
  @IsString()
  subject!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  guestEmail?: string;
}

export class AddMessageDto {
  @IsString()
  body!: string;
}
