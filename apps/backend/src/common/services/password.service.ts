import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Service for password hashing and verification
 * Refactor: Added for password-based authentication
 */
@Injectable()
export class PasswordService {
  private readonly saltRounds = 12;

  /**
   * Hash a plain text password
   * @param password - Plain text password to hash
   * @returns Hashed password
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verify a plain text password against a hash
   * @param password - Plain text password
   * @param hash - Hashed password to compare against
   * @returns True if password matches, false otherwise
   */
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   * @param password - Password to validate
   * @returns Object with validation result and message
   */
  validateStrength(password: string): {
    isValid: boolean;
    message?: string;
  } {
    if (password.length < 8) {
      return {
        isValid: false,
        message: 'Password must be at least 8 characters long',
      };
    }

    if (password.length > 128) {
      return {
        isValid: false,
        message: 'Password must not exceed 128 characters',
      };
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumberOrSpecial = /[\d\W]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumberOrSpecial) {
      return {
        isValid: false,
        message:
          'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character',
      };
    }

    return { isValid: true };
  }
}
