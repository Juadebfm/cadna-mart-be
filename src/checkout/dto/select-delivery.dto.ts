import { IsIn } from 'class-validator';

export class SelectDeliveryDto {
  @IsIn(['standard', 'express', 'pickup'])
  mode!: string;
}
