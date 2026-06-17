import { AccountType } from '@users/enums/account-type.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  accountType: AccountType;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
