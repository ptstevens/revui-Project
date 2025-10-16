import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { ScreenType } from '@prisma/client';

export class InitiateUploadDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(86400) // Max 24 hours
  urlExpiresIn?: number;

  // Story 2.2: Screen source metadata
  @IsOptional()
  @IsEnum(ScreenType)
  screenType?: ScreenType;

  @IsOptional()
  @IsString()
  sourceName?: string;
}
