import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @ApiPropertyOptional({
    type: [String],
    maxItems: 5,
    description:
      'Up to five buyer-owned images. Upload each through POST /media/upload?folder=support (JPEG, PNG, WebP, or GIF; max 5 MB each) before creating the ticket.',
  })
  attachmentPublicIds?: string[];
}

export class AddMessageDto {
  @IsString()
  body!: string;
}
