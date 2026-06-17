import { IsOptional, IsString } from 'class-validator';

export class SetCheckoutAddressDto {
  @IsString()
  recipientName!: string;

  @IsString()
  phoneNumber!: string;

  @IsString()
  street1!: string;

  @IsOptional()
  @IsString()
  street2?: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;
}
