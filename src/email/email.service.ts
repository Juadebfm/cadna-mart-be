import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { ConfigService } from '@config/config.service';
import { LoggerService } from '@logger/logger.service';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly fromAddress: string;
  private readonly logoUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.resend = new Resend(this.configService.email.resendApiKey);
    this.fromAddress = this.configService.email.fromAddress;
    this.logoUrl = this.configService.email.logoUrl;
  }

  // Hosted-image header rendered in every transactional email. Inline styles +
  // explicit width attribute so Outlook/legacy clients respect sizing.
  private logoHeader(): string {
    if (!this.logoUrl) return '';
    return `<div style="text-align: center; padding: 16px 0 24px;">
        <img src="${this.logoUrl}" alt="Cadna Mart" width="160" style="max-width: 160px; height: auto; display: inline-block; border: 0;" />
      </div>`;
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    await this.send(
      email,
      'Verify your Cadna Mart account',
      `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        ${this.logoHeader()}
        <h2 style="color: #6C63FF;">Verify your email</h2>
        <p>Your verification code is:</p>
        <div style="background: #f4f4f8; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6C63FF;">${code}</span>
        </div>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #888; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
      </div>`,
    );
  }

  async sendLoginOtp(email: string, code: string): Promise<void> {
    await this.send(
      email,
      'Your Cadna Mart login code',
      `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        ${this.logoHeader()}
        <h2 style="color: #6C63FF;">Login verification</h2>
        <p>Your login verification code is:</p>
        <div style="background: #f4f4f8; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6C63FF;">${code}</span>
        </div>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #888; font-size: 12px;">If you didn't try to log in, please secure your account immediately.</p>
      </div>`,
    );
  }

  async sendPasswordResetOtp(email: string, code: string): Promise<void> {
    await this.send(
      email,
      'Reset your Cadna Mart password',
      `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        ${this.logoHeader()}
        <h2 style="color: #6C63FF;">Password reset</h2>
        <p>Your password reset code is:</p>
        <div style="background: #f4f4f8; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6C63FF;">${code}</span>
        </div>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #888; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>`,
    );
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}: ${(error as Error).message}`,
        (error as Error).stack,
        'EmailService',
      );
    }
  }
}
