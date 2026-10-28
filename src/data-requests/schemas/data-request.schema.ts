export enum DataRequestKind {
  EXPORT = 'export',
  DELETE = 'delete',
}
export enum DataRequestStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  REJECTED = 'rejected',
}
export class DataRequest {
  userId!: string;
  kind!: DataRequestKind;
  status!: DataRequestStatus;
  processedBy!: string | null;
  processedAt!: Date | null;
  notes!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
