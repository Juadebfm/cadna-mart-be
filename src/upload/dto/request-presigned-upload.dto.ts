import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { UploadFolder } from '../upload.service';

export class RequestPresignedUploadDto {
  @ApiPropertyOptional({
    enum: ['products', 'stores', 'categories', 'general'],
    default: 'general',
  })
  @IsString()
  @IsOptional()
  @IsIn(['products', 'stores', 'categories', 'general'])
  folder?: UploadFolder;
}
