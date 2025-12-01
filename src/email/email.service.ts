import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: this.configService.get('EMAIL_SERVICE'),
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASSWORD'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string, firstName: string) {
    const mailOptions = {
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Verify Your Email - Rigaby',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Welcome to Rigaby, ${firstName}! 👋</h2>
          <p>Thank you for signing up. Please use the verification code below to verify your email address and start your learning journey.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <h3 style="color: #4F46E5; margin: 0 0 15px 0;">Your Verification Code</h3>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4F46E5; background: white; padding: 15px; border-radius: 6px; border: 2px dashed #4F46E5;">
              ${token}
            </div>
          </div>
          
          <p><strong>How to verify your email:</strong></p>
          <ol>
            <li>Go to the verification page in the Rigaby app</li>
            <li>Enter the code above exactly as shown</li>
            <li>Click "Verify Email" to complete the process</li>
          </ol>
          
          <p><strong>This code will expire in 24 hours.</strong></p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            If you didn't create an account with Rigaby, please ignore this email.
          </p>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(email: string, token: string, firstName: string) {
    const mailOptions = {
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Reset Your Password - Rigaby',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Password Reset Request</h2>
          <p>Hello ${firstName},</p>
          <p>We received a request to reset your password for your Rigaby account.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <h3 style="color: #4F46E5; margin: 0 0 15px 0;">Your Password Reset Code</h3>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4F46E5; background: white; padding: 15px; border-radius: 6px; border: 2px dashed #4F46E5;">
              ${token}
            </div>
          </div>
          
          <p><strong>How to reset your password:</strong></p>
          <ol>
            <li>Go to the password reset page in the Rigaby app</li>
            <li>Enter the code above exactly as shown</li>
            <li>Enter your new password and confirm it</li>
            <li>Click "Reset Password" to complete the process</li>
          </ol>
          
          <p><strong>This code will expire in 1 hour.</strong></p>
          
          <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendWelcomeEmail(email: string, firstName: string) {
    const mailOptions = {
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Welcome to Rigaby! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Welcome to Rigaby, ${firstName}! 🎉</h2>
          <p>Your email has been successfully verified and your account is now active.</p>
          <p>Start your learning journey today and earn rewards while you learn!</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #4F46E5; margin-top: 0;">What you can do now:</h3>
            <ul>
              <li>Complete daily reading tasks and earn $1 per task</li>
              <li>Watch educational videos and answer questions</li>
              <li>Join weekly tournaments for bigger rewards</li>
              <li>Refer friends and earn 25% commission</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            <p><strong>Ready to start learning and earning?</strong></p>
            <p>Open the Rigaby app and complete your first task today!</p>
          </div>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendPasswordChangeNotification(email: string, firstName: string) {
    const mailOptions = {
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Password Changed Successfully - Rigaby',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Password Changed Successfully</h2>
          <p>Hello ${firstName},</p>
          <p>This is to confirm that your Rigaby account password was recently changed.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #4F46E5; margin-top: 0;">Security Notice:</h3>
            <p>If you made this change, no further action is needed.</p>
            <p>If you didn't change your password, please contact our support team immediately.</p>
          </div>
          
          <p><strong>Security Tips:</strong></p>
          <ul>
            <li>Use a strong, unique password</li>
            <li>Never share your password with anyone</li>
            <li>Enable two-factor authentication if available</li>
            <li>Be cautious of phishing attempts</li>
          </ul>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated security notification. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  // Generate a user-friendly token (6-digit code)
  generateVerificationToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate a password reset token (6-digit code)
  generatePasswordResetToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}