import { IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';

export class CreateBookingDto {
  @IsMongoId()
  slotId!: string;

  @IsMongoId()
  durationTierId!: string;

  @IsMongoId()
  productId!: string;
}

export class GenerateSlotsDto {
  @IsMongoId()
  slotTypeId!: string;

  @IsString()
  startDate!: string;

  @IsString()
  endDate!: string;

  @IsInt()
  @Min(1)
  capacity!: number;
}

export class UpdateCapacityDto {
  @IsMongoId()
  slotTypeId!: string;

  @IsInt()
  @Min(1)
  capacity!: number;
}

export class SuspendBookingDto {
  @IsString()
  reason!: string;
}

export class RefundBookingDto {
  @IsOptional()
  @IsString()
  note?: string;
}
