import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class AddEvidenceDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  urls!: string[];
}
