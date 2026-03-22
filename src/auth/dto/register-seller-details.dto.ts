import { IsNotEmpty, IsString, IsOptional, IsDateString, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType } from '@sellers/schemas/seller-profile.schema';

export class RegisterSellerDetailsDto {
  @ApiProperty({ example: 'session-uuid-here' })
  @IsNotEmpty()
  @IsString()
  sessionId!: string;

  // Personal details
  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ example: '1990-01-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  // Business details
  @ApiProperty({ example: 'Steppers Store NG' })
  @IsNotEmpty()
  @IsString()
  businessName!: string;

  @ApiPropertyOptional({ example: 'RC-1234567', description: 'CAC registration number' })
  @IsOptional()
  @IsString()
  businessRegistrationNumber?: string;

  @ApiProperty({ example: 'Shop 15, Balogun Market, Lagos Island' })
  @IsNotEmpty()
  @IsString()
  businessAddress!: string;

  @ApiProperty({ enum: BusinessType, example: BusinessType.SOLE_PROPRIETOR })
  @IsNotEmpty()
  @IsEnum(BusinessType)
  businessType!: BusinessType;

  // Bank details
  @ApiProperty({ example: 'Access Bank' })
  @IsNotEmpty()
  @IsString()
  bankName!: string;

  @ApiProperty({ example: '0123456789' })
  @IsNotEmpty()
  @IsString()
  bankAccountNumber!: string;

  @ApiProperty({ example: 'John Doe Enterprises' })
  @IsNotEmpty()
  @IsString()
  bankAccountName!: string;

  @ApiProperty({ example: true })
  @IsNotEmpty()
  @IsBoolean()
  termsAccepted!: boolean;
}
