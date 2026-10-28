import { IsEnum, IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';
import { ReturnReason, ReturnRequestType } from '../schemas/return-request.schema';

export class CreateReturnDto {
  @IsMongoId()
  orderId!: string;

  @IsEnum(ReturnRequestType)
  requestType!: ReturnRequestType;

  // Product identifiers are used only for item returns. Names, sellers, and
  // prices are always taken from the immutable order snapshot.
  @IsOptional()
  @IsString()
  orderItemProductId?: string;

  @IsOptional()
  @IsString()
  orderItemVariantId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsEnum(ReturnReason)
  reason!: ReturnReason;

  @IsOptional()
  @IsString()
  description?: string;
}
