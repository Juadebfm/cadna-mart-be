import { IsNotEmpty, IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '@users/enums/account-type.enum';

export class RegisterAccountTypeDto {
  @ApiProperty({ example: 'session-uuid-here' })
  @IsNotEmpty()
  @IsString()
  sessionId!: string;

  @ApiProperty({ enum: AccountType, example: AccountType.BUYER })
  @IsNotEmpty()
  @IsEnum(AccountType)
  accountType!: AccountType;
}
