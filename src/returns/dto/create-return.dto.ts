import { IsEnum, IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';
import { ReturnReason } from '../schemas/return-request.schema';

export class CreateReturnDto {
  @IsMongoId()
  orderId!: string;

  @IsString()
  orderItemProductId!: string;

  @IsOptional()
  @IsString()
  orderItemVariantId?: string;

  @IsString()
  orderItemName!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsEnum(ReturnReason)
  reason!: ReturnReason;

  @IsOptional()
  @IsString()
  description?: string;
}
