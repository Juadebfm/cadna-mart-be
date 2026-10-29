import { BaseSchema } from '@shared/base/base.schema';
export enum BusinessType {
  INDIVIDUAL = 'individual',
  SOLE_PROPRIETOR = 'sole_proprietor',
  LLC = 'llc',
  PARTNERSHIP = 'partnership',
}

export enum SellerApplicantType {
  INDIVIDUAL = 'individual',
  REGISTERED_BUSINESS = 'registered_business',
}

export enum SellerApplicationStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  MORE_INFORMATION_NEEDED = 'more_information_needed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum SellerDocumentType {
  GOVERNMENT_ID = 'government_id',
  CAC_REGISTRATION = 'cac_registration',
  OWNER_ID = 'owner_id',
  OTHER = 'other',
}

export class SellerProfile extends BaseSchema {
  user!: string;
  applicantType!: SellerApplicantType | null;
  businessName!: string;
  businessRegistrationNumber!: string | null;
  businessAddress!: string;
  businessType!: BusinessType;
  bankName!: string | null;
  bankCode!: string | null;
  bankAccountNumber!: string | null;
  bankAccountName!: string | null;
  bankDetailsCompletedAt!: Date | null;
  bankVerificationProvider!: string | null;
  bankVerifiedAt!: Date | null;
  applicationStatus!: SellerApplicationStatus;
  submittedAt!: Date | null;
  reviewReason!: string | null;
  requestedDocumentTypes!: SellerDocumentType[];
  reviewedAt!: Date | null;
  reviewedBy!: string | null;
  isApproved!: boolean;
  approvedAt!: Date | null;
  approvedBy!: string | null;
}
