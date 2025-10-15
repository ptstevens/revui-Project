import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsString, MinLength, ArrayMinSize, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class UserInviteDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}

export class BulkInviteUsersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50) // Limit to 50 invites at once
  @ValidateNested({ each: true })
  @Type(() => UserInviteDto)
  users: UserInviteDto[];
}
