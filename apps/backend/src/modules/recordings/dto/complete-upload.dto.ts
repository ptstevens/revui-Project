import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CompleteUploadDto {
  @IsString()
  @IsNotEmpty()
  s3Key: string;

  @IsNumber()
  @Min(1)
  fileSize: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number; // In seconds
}
