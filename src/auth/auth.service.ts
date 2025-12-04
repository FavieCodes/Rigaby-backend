import { 
  Injectable, 
  UnauthorizedException, 
  ConflictException, 
  BadRequestException,
  NotFoundException,
  ForbiddenException 
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { 
  SignUpDto, 
  SignInDto, 
  TokenResponseDto, 
  VerifyEmailDto, 
  ForgotPasswordDto, 
  ResetPasswordDto,
  UpdateProfileDto,
  ChangePasswordDto,
  AdminUpdateUserDto
} from './auth.dtos';
import { UserEntity } from './entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { EmailService } from '../email/email.service';
import { ReferralService } from '../referral/referral.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private walletService: WalletService,
    private emailService: EmailService,
    private referralService: ReferralService,
  ) {}

  async signUp(signUpDto: SignUpDto): Promise<{ user: UserEntity; tokens: TokenResponseDto }> {
    const { email, phone, password, firstName, lastName, subscriptionTier, referralCode } = signUpDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }

    // Validate referral code if provided
    let referredById: string | undefined;
    if (referralCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode },
      });
      
      if (!referrer) {
        throw new BadRequestException('Invalid referral code');
      }
      referredById = referrer.id;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate 6-digit email verification token
    const emailVerificationToken = this.emailService.generateVerificationToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user with referrer relationship
    const user = await this.prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        firstName,
        lastName,
        subscriptionTier: subscriptionTier || 'ENTRY',
        referredById,
        emailVerificationToken,
        emailVerificationExpires,
        wallet: {
          create: {
            balance: 0,
            locked: 0,
          }
        }
      },
      include: {
        wallet: true,
        referrer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            referralCode: true
          }
        }
      }
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(user.email, emailVerificationToken, user.firstName);
    } catch (error) {
      // Don't fail registration if email fails
      console.error('Failed to send verification email:', error);
    }

    // Convert Decimal to number for the response
    const userResponse = {
      ...user,
      referralBonus: Number(user.referralBonus)
    };

    // Return user without sensitive fields
    const { 
      password: _, 
      emailVerificationToken: evToken, 
      emailVerificationExpires: evExpires, 
      passwordResetToken, 
      passwordResetExpires, 
      ...userWithoutSensitiveData 
    } = userResponse;
    
    return {
      user: new UserEntity(userWithoutSensitiveData),
      tokens,
    };
  }

  async signIn(signInDto: SignInDto): Promise<{ user: UserEntity; tokens: TokenResponseDto }> {
    const { email, password } = signInDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        wallet: true,
        referrer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            referralCode: true
          }
        }
      }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email address before signing in');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Convert Decimal to number for the response
    const userResponse = {
      ...user,
      referralBonus: Number(user.referralBonus)
    };

    // Return user without sensitive fields
    const { 
      password: _, 
      emailVerificationToken, 
      emailVerificationExpires, 
      passwordResetToken, 
      passwordResetExpires, 
      ...userWithoutSensitiveData 
    } = userResponse;
    
    return {
      user: new UserEntity(userWithoutSensitiveData),
      tokens,
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
    const { token } = verifyEmailDto;

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
      include: {
        referrer: true
      }
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(user.email, user.firstName);
    } catch (error) {
      // Don't fail verification if email fails
      console.error('Failed to send welcome email:', error);
    }

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new 6-digit verification token
    const emailVerificationToken = this.emailService.generateVerificationToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationExpires,
      },
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(user.email, emailVerificationToken, user.firstName);
    } catch (error) {
      throw new BadRequestException('Failed to send verification email');
    }

    return { message: 'Verification code sent successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Check if the email exists in the system
    if (!user) {
      throw new NotFoundException('Email is not registered. Please enter a valid email address.');
    }

    // Generate 6-digit password reset token
    const passwordResetToken = this.emailService.generatePasswordResetToken();
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetExpires,
      },
    });

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(user.email, passwordResetToken, user.firstName);
    } catch (error) {
      throw new BadRequestException('Failed to send password reset email');
    }

    return { message: 'Password reset code has been sent to your email' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, password } = resetPasswordDto;

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  // Update user profile
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<UserEntity> {
    // Validate userId is provided and is a valid string
    if (!userId || userId === 'undefined') {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if phone is being updated and if it's already taken
    if (updateProfileDto.phone && updateProfileDto.phone !== user.phone) {
      const existingUser = await this.prisma.user.findUnique({
        where: { phone: updateProfileDto.phone },
      });

      if (existingUser) {
        throw new ConflictException('Phone number already taken');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
      include: {
        wallet: true,
        referrer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            referralCode: true
          }
        }
      }
    });

    // Convert Decimal to number for the response
    const userResponse = {
      ...updatedUser,
      referralBonus: Number(updatedUser.referralBonus)
    };

    // Return user without sensitive fields
    const { 
      password: _, 
      emailVerificationToken, 
      emailVerificationExpires, 
      passwordResetToken, 
      passwordResetExpires, 
      ...userWithoutSensitiveData 
    } = userResponse;

    return new UserEntity(userWithoutSensitiveData);
  }

  // Change password
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Validate userId is provided and is a valid string
    if (!userId || userId === 'undefined') {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
      },
    });

    // Send password change notification email
    try {
      await this.emailService.sendPasswordChangeNotification(user.email, user.firstName);
    } catch (error) {
      // Don't fail if email fails
      console.error('Failed to send password change notification:', error);
    }

    return { message: 'Password changed successfully' };
  }

  // Soft delete (deactivate) user account
  async deactivateAccount(userId: string): Promise<{ message: string }> {
    // Validate userId is provided and is a valid string
    if (!userId || userId === 'undefined') {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('Account is already deactivated');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
      },
    });

    return { message: 'Account deactivated successfully' };
  }

  // Reactivate user account
  async reactivateAccount(userId: string): Promise<{ message: string }> {
    // Validate userId is provided and is a valid string
    if (!userId || userId === 'undefined') {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isActive) {
      throw new BadRequestException('Account is already active');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
      },
    });

    return { message: 'Account reactivated successfully' };
  }

  // Permanently delete user account (only for admin or the user themselves)
  async deleteAccount(userId: string, requestingUserId: string, requestingUserRole: UserRole): Promise<{ message: string }> {
    // Validate userId is provided and is a valid string
    if (!userId || userId === 'undefined') {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check permissions: user can delete their own account, admin can delete any account
    if (requestingUserRole !== UserRole.ADMIN && userId !== requestingUserId) {
      throw new ForbiddenException('You can only delete your own account');
    }

    // Use transaction to delete user and related records
    await this.prisma.$transaction(async (tx) => {
      // Delete user's wallet transactions first
      await tx.transaction.deleteMany({
        where: {
          wallet: {
            userId: userId
          }
        }
      });

      // Delete user's wallet
      await tx.wallet.deleteMany({
        where: { userId: userId }
      });

      // Delete user's tasks and related questions
      await tx.question.deleteMany({
        where: {
          task: {
            userId: userId
          }
        }
      });

      await tx.task.deleteMany({
        where: { userId: userId }
      });

      // Delete user's tournament entries
      await tx.tournamentEntry.deleteMany({
        where: { userId: userId }
      });

      // Delete referral bonuses
      await tx.referralBonus.deleteMany({
        where: {
          OR: [
            { referrerId: userId },
            { referredUserId: userId }
          ]
        }
      });

      // Finally delete the user
      await tx.user.delete({
        where: { id: userId }
      });
    });

    return { message: 'Account permanently deleted successfully' };
  }

  // Get all users (admin only) - UPDATED: Always return all users including inactive
  async getAllUsers(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      include: {
        wallet: true,
        referrer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            referralCode: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return users.map(user => {
      // Convert Decimal to number for the response
      const userResponse = {
        ...user,
        referralBonus: Number(user.referralBonus)
      };

      // Return user without sensitive fields
      const { 
        password: _, 
        emailVerificationToken, 
        emailVerificationExpires, 
        passwordResetToken, 
        passwordResetExpires, 
        ...userWithoutSensitiveData 
      } = userResponse;

      return new UserEntity(userWithoutSensitiveData);
    });
  }

  // Admin update user
  async adminUpdateUser(userId: string, adminUpdateUserDto: AdminUpdateUserDto): Promise<UserEntity> {
    // Validate userId is provided and is a valid string
    if (!userId || userId === 'undefined') {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being updated and if it's already taken
    if (adminUpdateUserDto.email && adminUpdateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: adminUpdateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already taken');
      }
    }

    // Check if phone is being updated and if it's already taken
    if (adminUpdateUserDto.phone && adminUpdateUserDto.phone !== user.phone) {
      const existingUser = await this.prisma.user.findUnique({
        where: { phone: adminUpdateUserDto.phone },
      });

      if (existingUser) {
        throw new ConflictException('Phone number already taken');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: adminUpdateUserDto,
      include: {
        wallet: true,
        referrer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            referralCode: true
          }
        }
      }
    });

    const userResponse = {
      ...updatedUser,
      referralBonus: Number(updatedUser.referralBonus)
    };

    // Return user without sensitive fields
    const { 
      password: _, 
      emailVerificationToken, 
      emailVerificationExpires, 
      passwordResetToken, 
      passwordResetExpires, 
      ...userWithoutSensitiveData 
    } = userResponse;

    return new UserEntity(userWithoutSensitiveData);
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        wallet: true,
        referrer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            referralCode: true
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    if (password === '') {
      // Convert Decimal to number
      const userResponse = {
        ...user,
        referralBonus: Number(user.referralBonus)
      };
      
      const { 
        password: _, 
        emailVerificationToken, 
        emailVerificationExpires, 
        passwordResetToken, 
        passwordResetExpires, 
        ...result 
      } = userResponse;
      return result;
    }

    // For login, check password and email verification
    if (user.isEmailVerified && (await bcrypt.compare(password, user.password))) {
      // Convert Decimal to number
      const userResponse = {
        ...user,
        referralBonus: Number(user.referralBonus)
      };
      
      const { 
        password: _, 
        emailVerificationToken, 
        emailVerificationExpires, 
        passwordResetToken, 
        passwordResetExpires, 
        ...result 
      } = userResponse;
      return result;
    }
    
    return null;
  }

  private async generateTokens(userId: string, email: string, role: string): Promise<TokenResponseDto> {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, { expiresIn: '7d' } as any),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  async refreshTokens(userId: string): Promise<TokenResponseDto> {
    // Validate userId is provided and is a valid string
    if (!userId || userId === 'undefined') {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(user.id, user.email, user.role);
  }
}