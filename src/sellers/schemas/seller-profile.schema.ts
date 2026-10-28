import { BaseSchema } from '@shared/base/base.schema';
export enum BusinessType {
  SOLE_PROPRIETOR = 'sole_proprietor',
  LLC = 'llc',
  PARTNERSHIP = 'partnership',
}
export class SellerProfile extends BaseSchema {
  user!: string;
  businessName!: string;
  businessRegistrationNumber!: string | null;
  businessAddress!: string;
  businessType!: BusinessType;
  bankName!: string | null;
  bankAccountNumber!: string | null;
  bankAccountName!: string | null;
  bankDetailsCompletedAt!: Date | null;
  isApproved!: boolean;
  approvedAt!: Date | null;
  approvedBy!: string | null;
}
