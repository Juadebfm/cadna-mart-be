import { IsString, IsOptional, IsNumber } from 'class-validator';

export class LogisticsQuoteDto {
  @IsString()
  pickupCity!: string;

  @IsString()
  dropoffCity!: string;

  @IsString()
  dropoffAddress!: string;

  @IsOptional()
  @IsNumber()
  weightKg?: number;
}

export class CoverageCheckDto {
  @IsString()
  city!: string;

  @IsString()
  address!: string;
}

export class BookCourierDto {
  @IsString()
  orderId!: string;

  @IsString()
  orderRef!: string;

  @IsOptional()
  @IsString()
  preferredProvider?: string;
}

export class PodUploadDto {
  @IsString()
  bookingId!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  url?: string;
}

export class PickupActionDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
