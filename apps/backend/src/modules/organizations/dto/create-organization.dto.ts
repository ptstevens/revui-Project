import { IsString, IsEmail, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  organizationName: string;

  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  adminName: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  industry?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  companySize?: string;
}
