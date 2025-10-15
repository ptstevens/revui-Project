import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MagicLinkService } from '@/common/services/magic-link.service';
import { LinkPurpose } from '@prisma/client';

/**
 * Story 1.2: Updated to use centralized MagicLinkService
 */
@Injectable()
export class EmailService {
  constructor(
    private readonly configService: ConfigService,
    private readonly magicLinkService: MagicLinkService
  ) {}

  /**
   * Create a verification token for email verification
   * Story 1.2: Updated to use MagicLinkService with configurable expiration
   *
   * @param tenantId - The tenant ID
   * @param email - The email address
   */
  async createVerificationToken(
    tenantId: string,
    email: string
  ): Promise<string> {
    // Use centralized MagicLinkService with organization's configured expiration
    return await this.magicLinkService.generate({
      tenantId,
      email,
      purpose: LinkPurpose.EMAIL_VERIFICATION,
    });
  }

  /**
   * Send welcome email with verification link
   */
  async sendWelcomeEmail(
    email: string,
    name: string,
    organizationName: string,
    verificationToken: string
  ): Promise<void> {
    const frontendUrl = this.configService.get('CORS_ORIGIN') || 'http://localhost:5173';
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

    // Email template
    const subject = `Welcome to Revui - Verify your email`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #4F46E5; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Welcome to Revui</h1>
        </div>

        <div style="padding: 30px; background-color: #f9f9f9;">
          <p>Hi ${name},</p>

          <p>Welcome to <strong>${organizationName}</strong> on Revui!</p>

          <p>Your organization has been successfully registered. To complete the setup and start using the platform, please verify your email address by clicking the button below:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}"
               style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Verify Email Address
            </a>
          </div>

          <p>Or copy and paste this link into your browser:</p>
          <p style="background-color: #fff; padding: 10px; border: 1px solid #ddd; word-break: break-all;">
            ${verificationLink}
          </p>

          <p><strong>This verification link will expire in 24 hours.</strong></p>

          <h3>Next Steps:</h3>
          <ol>
            <li>Verify your email address</li>
            <li>Invite your team members</li>
            <li>Create your first task</li>
            <li>Start verifying competencies</li>
          </ol>

          <p>If you didn't create this account, please ignore this email.</p>

          <p>Best regards,<br>The Revui Team</p>
        </div>

        <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Revui. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    // In development, log the email instead of sending
    if (this.configService.get('NODE_ENV') === 'development') {
      console.log('\n📧 Email would be sent:');
      console.log(`To: ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Verification Link: ${verificationLink}\n`);
      return;
    }

    // TODO: Implement actual email sending with SendGrid or AWS SES
    // For now, just log in production too until email service is configured
    console.log('Email sending not yet configured. Verification link:', verificationLink);
  }

  /**
   * Send user invitation email
   * Story 1.3: User invitation with magic link
   */
  async sendInvitationEmail(
    email: string,
    name: string,
    organizationName: string,
    inviterName: string,
    role: string,
    invitationToken: string
  ): Promise<void> {
    const frontendUrl = this.configService.get('CORS_ORIGIN') || 'http://localhost:5173';
    const invitationLink = `${frontendUrl}/accept-invitation?token=${invitationToken}`;

    // Email template
    const subject = `You've been invited to join ${organizationName} on Revui`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #4F46E5; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">You're Invited to Revui</h1>
        </div>

        <div style="padding: 30px; background-color: #f9f9f9;">
          <p>Hi ${name},</p>

          <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on Revui as a <strong>${role}</strong>.</p>

          <p>Revui is a competency verification platform that helps organizations ensure quality and compliance through screen recordings of task completion.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}"
               style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Accept Invitation
            </a>
          </div>

          <p>Or copy and paste this link into your browser:</p>
          <p style="background-color: #fff; padding: 10px; border: 1px solid #ddd; word-break: break-all;">
            ${invitationLink}
          </p>

          <p><strong>This invitation link will expire in 48 hours.</strong></p>

          <h3>What's Next?</h3>
          <ol>
            <li>Click the invitation link above</li>
            <li>Set up your account</li>
            <li>Start collaborating with your team</li>
          </ol>

          <p>If you weren't expecting this invitation or have any questions, please contact ${inviterName} or your organization administrator.</p>

          <p>Best regards,<br>The Revui Team</p>
        </div>

        <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Revui. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    // In development, log the email instead of sending
    if (this.configService.get('NODE_ENV') === 'development') {
      console.log('\n📧 Invitation Email would be sent:');
      console.log(`To: ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Invitation Link: ${invitationLink}\n`);
      return;
    }

    // TODO: Implement actual email sending with SendGrid or AWS SES
    console.log('Email sending not yet configured. Invitation link:', invitationLink);
  }

  /**
   * Send task invitation email (for future stories)
   */
  async sendTaskInvitation(
    email: string,
    taskTitle: string,
    magicLinkToken: string
  ): Promise<void> {
    // TODO: Implement for future story
  }
}
