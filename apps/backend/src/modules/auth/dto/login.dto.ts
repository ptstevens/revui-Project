import { IsEmail, IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO for user login with email and password
 * Refactor: Added for password-based authentication
 */
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  deviceName?: string;
}
