import { Document } from 'mongoose';
import { AccountType } from '../enums/account-type.enum';
import { AuthProvider } from '../enums/auth-provider.enum';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string | null;
  accountType: AccountType;
  authProvider: AuthProvider;
  clerkId: string | null;
  phoneNumber: string | null;
  dateOfBirth: Date | null;
  isVerified: boolean;
  isActive: boolean;
  isTwoFactorEnabled: boolean;
  termsAcceptedAt: Date | null;
  lastLoginAt: Date | null;
  refreshToken: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
}
