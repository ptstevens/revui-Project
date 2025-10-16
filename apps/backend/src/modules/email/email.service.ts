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
   * Send task invitation email
   * Story 1.6: Task assignment notification
   */
  async sendTaskInvitation(
    email: string,
    name: string,
    taskTitle: string,
    taskDescription: string,
    organizationName: string,
    assignedByName: string,
    dueDate?: Date,
  ): Promise<void> {
    const frontendUrl = this.configService.get('CORS_ORIGIN') || 'http://localhost:5173';
    const taskLink = `${frontendUrl}/tasks`;

    const dueDateText = dueDate
      ? `<p><strong>Due Date:</strong> ${dueDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}</p>`
      : '';

    const subject = `New Task Assigned: ${taskTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #4F46E5; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">New Task Assigned</h1>
        </div>

        <div style="padding: 30px; background-color: #f9f9f9;">
          <p>Hi ${name},</p>

          <p><strong>${assignedByName}</strong> has assigned you a new task in <strong>${organizationName}</strong>:</p>

          <div style="background-color: #fff; padding: 20px; border-left: 4px solid #4F46E5; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #4F46E5;">${taskTitle}</h2>
            <p>${taskDescription}</p>
            ${dueDateText}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${taskLink}"
               style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Task
            </a>
          </div>

          <h3>What You Need to Do:</h3>
          <ol>
            <li>Review the task requirements</li>
            <li>Start your screen recording</li>
            <li>Complete the task while recording</li>
            <li>Submit your recording for review</li>
          </ol>

          <p>If you have any questions about this task, please contact ${assignedByName}.</p>

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
      console.log('\n📧 Task Invitation Email would be sent:');
      console.log(`To: ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Task Link: ${taskLink}\n`);
      return;
    }

    console.log('Email sending not yet configured. Task link:', taskLink);
  }

  /**
   * Send recording ready for review email
   * Story 1.6: Notify reviewers when a recording is submitted
   */
  async sendRecordingReadyForReview(
    email: string,
    reviewerName: string,
    submitterName: string,
    taskTitle: string,
    organizationName: string,
    recordingId: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get('CORS_ORIGIN') || 'http://localhost:5173';
    const reviewLink = `${frontendUrl}/recordings/${recordingId}`;

    const subject = `Recording Ready for Review: ${taskTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #4F46E5; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Recording Ready for Review</h1>
        </div>

        <div style="padding: 30px; background-color: #f9f9f9;">
          <p>Hi ${reviewerName},</p>

          <p><strong>${submitterName}</strong> has submitted a recording for your review in <strong>${organizationName}</strong>:</p>

          <div style="background-color: #fff; padding: 20px; border-left: 4px solid #10B981; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #10B981;">Task: ${taskTitle}</h2>
            <p><strong>Submitted by:</strong> ${submitterName}</p>
            <p><strong>Status:</strong> Awaiting Review</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewLink}"
               style="background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Review Recording
            </a>
          </div>

          <h3>Review Process:</h3>
          <ol>
            <li>Watch the submitted recording</li>
            <li>Verify task completion against requirements</li>
            <li>Provide feedback if needed</li>
            <li>Approve or request improvements</li>
          </ol>

          <p>Timely reviews help maintain team productivity and ensure quality standards.</p>

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
      console.log('\n📧 Recording Review Email would be sent:');
      console.log(`To: ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Review Link: ${reviewLink}\n`);
      return;
    }

    console.log('Email sending not yet configured. Review link:', reviewLink);
  }

  /**
   * Send feedback received email
   * Story 1.6: Notify submitter when reviewer provides feedback
   */
  async sendFeedbackReceived(
    email: string,
    userName: string,
    reviewerName: string,
    taskTitle: string,
    feedback: string,
    organizationName: string,
    recordingId: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get('CORS_ORIGIN') || 'http://localhost:5173';
    const recordingLink = `${frontendUrl}/recordings/${recordingId}`;

    const subject = `Feedback Received: ${taskTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #F59E0B; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Feedback Received</h1>
        </div>

        <div style="padding: 30px; background-color: #f9f9f9;">
          <p>Hi ${userName},</p>

          <p><strong>${reviewerName}</strong> has reviewed your recording and provided feedback for <strong>${taskTitle}</strong> in <strong>${organizationName}</strong>:</p>

          <div style="background-color: #fff; padding: 20px; border-left: 4px solid #F59E0B; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #F59E0B;">Reviewer Feedback:</h3>
            <p style="white-space: pre-wrap;">${feedback}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${recordingLink}"
               style="background-color: #F59E0B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Recording & Feedback
            </a>
          </div>

          <h3>Next Steps:</h3>
          <ol>
            <li>Review the feedback carefully</li>
            <li>Address any concerns raised</li>
            <li>Submit an improved recording if needed</li>
          </ol>

          <p>Constructive feedback helps improve performance and ensure quality standards are met.</p>

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
      console.log('\n📧 Feedback Email would be sent:');
      console.log(`To: ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Recording Link: ${recordingLink}\n`);
      return;
    }

    console.log('Email sending not yet configured. Recording link:', recordingLink);
  }

  /**
   * Send recording status email (approved or failed)
   * Story 1.6: Notify submitter of final review decision
   */
  async sendRecordingStatus(
    email: string,
    userName: string,
    reviewerName: string,
    taskTitle: string,
    status: 'APPROVED' | 'FAILED',
    feedback: string | null,
    organizationName: string,
    recordingId: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get('CORS_ORIGIN') || 'http://localhost:5173';
    const recordingLink = `${frontendUrl}/recordings/${recordingId}`;

    const isApproved = status === 'APPROVED';
    const statusColor = isApproved ? '#10B981' : '#EF4444';
    const statusText = isApproved ? 'Approved' : 'Requires Improvement';
    const statusIcon = isApproved ? '✓' : '✗';

    const subject = `Recording ${statusText}: ${taskTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: ${statusColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">${statusIcon} Recording ${statusText}</h1>
        </div>

        <div style="padding: 30px; background-color: #f9f9f9;">
          <p>Hi ${userName},</p>

          <p><strong>${reviewerName}</strong> has ${isApproved ? 'approved' : 'reviewed'} your recording for <strong>${taskTitle}</strong> in <strong>${organizationName}</strong>.</p>

          <div style="background-color: #fff; padding: 20px; border-left: 4px solid ${statusColor}; margin: 20px 0;">
            <h2 style="margin-top: 0; color: ${statusColor};">Status: ${statusText}</h2>
            <p><strong>Task:</strong> ${taskTitle}</p>
            <p><strong>Reviewed by:</strong> ${reviewerName}</p>
            ${
              feedback
                ? `
            <h3 style="color: #666;">Feedback:</h3>
            <p style="white-space: pre-wrap;">${feedback}</p>
            `
                : ''
            }
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${recordingLink}"
               style="background-color: ${statusColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Recording Details
            </a>
          </div>

          ${
            isApproved
              ? `
          <p style="color: #10B981; font-weight: bold;">Congratulations! Your competency has been verified for this task.</p>
          `
              : `
          <h3>Next Steps:</h3>
          <ol>
            <li>Review the feedback carefully</li>
            <li>Address the areas that need improvement</li>
            <li>Submit a new recording when ready</li>
          </ol>
          <p>Don't be discouraged - this is an opportunity to learn and improve!</p>
          `
          }

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
      console.log(`\n📧 Recording ${statusText} Email would be sent:`);
      console.log(`To: ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Recording Link: ${recordingLink}\n`);
      return;
    }

    console.log('Email sending not yet configured. Recording link:', recordingLink);
  }
}
