import { Document } from 'mongoose';
import { Role } from '../enums/role.enum';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  refreshToken: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
}
