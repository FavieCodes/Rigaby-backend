import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  UseGuards, 
  Get, 
  Req,
  Patch,
  Put,
  Delete,
  Param,
  BadRequestException
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { 
  SignUpDto, 
  SignInDto, 
  TokenResponseDto, 
  VerifyEmailDto, 
  ForgotPasswordDto, 
  ResetPasswordDto,
  UpdateProfileDto,
  ChangePasswordDto,
  AdminUpdateUserDto,
  SuccessResponse,
  UserWithTokensResponse,
  MessageResponse,
  ErrorResponse
} from './auth.dtos';
import { UserEntity } from './entities/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { 
  ApiBearerAuth, 
  ApiOperation, 
  ApiResponse, 
  ApiTags,
  ApiBody
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Authentication & User Management')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ 
    summary: 'Register a new user',
    description: 'Creates a new user account, sends verification email, and creates a wallet for the user.'
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered. Verification email sent.',
    type: SuccessResponse<UserWithTokensResponse>
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists',
    type: ErrorResponse
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    type: ErrorResponse
  })
  async signUp(@Body() signUpDto: SignUpDto): Promise<SuccessResponse<UserWithTokensResponse>> {
    const result = await this.authService.signUp(signUpDto);
    return new SuccessResponse(
      HttpStatus.CREATED,
      'User registered successfully. Verification email sent.',
      result
    );
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'User login',
    description: 'Authenticates user credentials and returns user data with access tokens.'
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: SuccessResponse<UserWithTokensResponse>
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or email not verified',
    type: ErrorResponse
  })
  async signIn(@Body() signInDto: SignInDto): Promise<SuccessResponse<UserWithTokensResponse>> {
    const result = await this.authService.signIn(signInDto);
    return new SuccessResponse(
      HttpStatus.OK,
      'Login successful',
      result
    );
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Verify email address',
    description: 'Verifies user email using the 6-digit token sent to their email.'
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    type: SuccessResponse<MessageResponse>
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification token',
    type: ErrorResponse
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<SuccessResponse<MessageResponse>> {
    const result = await this.authService.verifyEmail(verifyEmailDto);
    return new SuccessResponse(
      HttpStatus.OK,
      'Email verified successfully',
      result
    );
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Resend verification email',
    description: 'Resends the email verification code to the user\'s email address.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          example: 'john@example.com'
        }
      },
      required: ['email']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    type: SuccessResponse<MessageResponse>
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: ErrorResponse
  })
  @ApiResponse({
    status: 400,
    description: 'Email already verified or failed to send email',
    type: ErrorResponse
  })
  async resendVerification(@Body() { email }: { email: string }): Promise<SuccessResponse<MessageResponse>> {
    const result = await this.authService.resendVerificationEmail(email);
    return new SuccessResponse(
      HttpStatus.OK,
      'Verification email sent successfully',
      result
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Request password reset',
    description: 'Initiates password reset process by sending a 6-digit code to the user\'s email.'
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset link sent if email exists',
    type: SuccessResponse<MessageResponse>
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<SuccessResponse<MessageResponse>> {
    const result = await this.authService.forgotPassword(forgotPasswordDto);
    return new SuccessResponse(
      HttpStatus.OK,
      'If the email exists, a password reset code has been sent',
      result
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Reset password with token',
    description: 'Resets user password using the 6-digit token received via email.'
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: SuccessResponse<MessageResponse>
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
    type: ErrorResponse
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<SuccessResponse<MessageResponse>> {
    const result = await this.authService.resetPassword(resetPasswordDto);
    return new SuccessResponse(
      HttpStatus.OK,
      'Password reset successfully',
      result
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get current user profile',
    description: 'Retrieves the authenticated user\'s profile information.'
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: SuccessResponse<UserEntity>
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse
  })
  async getProfile(@Req() req): Promise<SuccessResponse<UserEntity>> {
    const user = await this.authService.validateUser(req.user.email, '');
    return new SuccessResponse(
      HttpStatus.OK,
      'User profile retrieved successfully',
      new UserEntity(user)
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update user profile',
    description: 'Updates the authenticated user\'s profile information.'
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: SuccessResponse<UserEntity>
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse
  })
  @ApiResponse({
    status: 409,
    description: 'Phone number already taken',
    type: ErrorResponse
  })
  async updateProfile(@Req() req, @Body() updateProfileDto: UpdateProfileDto): Promise<SuccessResponse<UserEntity>> {
    // FIXED: Use userId from JWT payload (sub field)
    const userId = req.user.userId || req.user.sub;
    
    // Validate that userId exists and is not undefined
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    const result = await this.authService.updateProfile(userId, updateProfileDto);
    return new SuccessResponse(
      HttpStatus.OK,
      'Profile updated successfully',
      result
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Change password',
    description: 'Changes the authenticated user\'s password.'
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    type: SuccessResponse<MessageResponse>
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or current password incorrect',
    type: ErrorResponse
  })
  async changePassword(@Req() req, @Body() changePasswordDto: ChangePasswordDto): Promise<SuccessResponse<MessageResponse>> {
    // FIXED: Use userId from JWT payload (sub field)
    const userId = req.user.userId || req.user.sub;
    
    // Validate that userId exists and is not undefined
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    const result = await this.authService.changePassword(userId, changePasswordDto);
    return new SuccessResponse(
      HttpStatus.OK,
      'Password changed successfully',
      result
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('deactivate')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Deactivate account',
    description: 'Soft deletes (deactivates) the authenticated user\'s account.'
  })
  @ApiResponse({
    status: 200,
    description: 'Account deactivated successfully',
    type: SuccessResponse<MessageResponse>
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse
  })
  @ApiResponse({
    status: 400,
    description: 'Account is already deactivated',
    type: ErrorResponse
  })
  async deactivateAccount(@Req() req): Promise<SuccessResponse<MessageResponse>> {
    // FIXED: Use userId from JWT payload (sub field)
    const userId = req.user.userId || req.user.sub;
    
    // Validate that userId exists and is not undefined
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    const result = await this.authService.deactivateAccount(userId);
    return new SuccessResponse(
      HttpStatus.OK,
      'Account deactivated successfully',
      result
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('reactivate')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Reactivate account',
    description: 'Reactivates the authenticated user\'s account.'
  })
  @ApiResponse({
    status: 200,
    description: 'Account reactivated successfully',
    type: SuccessResponse<MessageResponse>
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse
  })
  @ApiResponse({
    status: 400,
    description: 'Account is already active',
    type: ErrorResponse
  })
  async reactivateAccount(@Req() req): Promise<SuccessResponse<MessageResponse>> {
    // FIXED: Use userId from JWT payload (sub field)
    const userId = req.user.userId || req.user.sub;
    
    // Validate that userId exists and is not undefined
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    const result = await this.authService.reactivateAccount(userId);
    return new SuccessResponse(
      HttpStatus.OK,
      'Account reactivated successfully',
      result
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('account')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Permanently delete account',
    description: 'Permanently deletes the authenticated user\'s account and all related data.'
  })
  @ApiResponse({
    status: 200,
    description: 'Account permanently deleted successfully',
    type: SuccessResponse<MessageResponse>
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse
  })
  async deleteAccount(@Req() req): Promise<SuccessResponse<MessageResponse>> {
    // FIXED: Use userId from JWT payload (sub field)
    const userId = req.user.userId || req.user.sub;
    
    // Validate that userId exists and is not undefined
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    const requestingUserRole = req.user.role;
    const result = await this.authService.deleteAccount(userId, userId, requestingUserRole);
    return new SuccessResponse(
      HttpStatus.OK,
      'Account permanently deleted successfully',
      result
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Refresh access token',
    description: 'Generates new access and refresh tokens using the current refresh token.'
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: SuccessResponse<TokenResponseDto>
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse
  })
  async refreshTokens(@Req() req): Promise<SuccessResponse<TokenResponseDto>> {
    // FIXED: Use userId from JWT payload (sub field)
    const userId = req.user.userId || req.user.sub;
    
    // Validate that userId exists and is not undefined
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    const result = await this.authService.refreshTokens(userId);
    return new SuccessResponse(
      HttpStatus.OK,
      'Token refreshed successfully',
      result
    );
  }

  // Admin only endpoints
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('users')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get all users (Admin only)',
    description: 'Retrieves all users including both active and inactive users. Admin only endpoint.'
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: SuccessResponse<UserEntity[]>
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    type: ErrorResponse
  })
  async getAllUsers(@Req() req): Promise<SuccessResponse<UserEntity[]>> {
    const result = await this.authService.getAllUsers();
    return new SuccessResponse(
      HttpStatus.OK,
      'Users retrieved successfully',
      result
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('users/:userId')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update user (Admin only)',
    description: 'Updates any user\'s information. Admin only endpoint.'
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: SuccessResponse<UserEntity>
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    type: ErrorResponse
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: ErrorResponse
  })
  async adminUpdateUser(
    @Req() req,
    @Param('userId') userId: string,
    @Body() adminUpdateUserDto: AdminUpdateUserDto
  ): Promise<SuccessResponse<UserEntity>> {
    const result = await this.authService.adminUpdateUser(userId, adminUpdateUserDto);
    return new SuccessResponse(
      HttpStatus.OK,
      'User updated successfully',
      result
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('users/:userId')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Permanently delete user (Admin only)',
    description: 'Permanently deletes any user account and all related data. Admin only endpoint.'
  })
  @ApiResponse({
    status: 200,
    description: 'User permanently deleted successfully',
    type: SuccessResponse<MessageResponse>
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    type: ErrorResponse
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: ErrorResponse
  })
  async adminDeleteUser(
    @Req() req,
    @Param('userId') userId: string
  ): Promise<SuccessResponse<MessageResponse>> {
    // FIXED: Use userId from JWT payload (sub field)
    const requestingUserId = req.user.userId || req.user.sub;
    const requestingUserRole = req.user.role;
    const result = await this.authService.deleteAccount(userId, requestingUserId, requestingUserRole);
    return new SuccessResponse(
      HttpStatus.OK,
      'User permanently deleted successfully',
      result
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('users/:userId/deactivate')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Deactivate user account (Admin only)',
    description: 'Deactivates any user account. Admin only endpoint.'
  })
  @ApiResponse({
    status: 200,
    description: 'User account deactivated successfully',
    type: SuccessResponse<MessageResponse>
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    type: ErrorResponse
  })
  async adminDeactivateUser(@Req() req, @Param('userId') userId: string): Promise<SuccessResponse<MessageResponse>> {
    const result = await this.authService.deactivateAccount(userId);
    return new SuccessResponse(
      HttpStatus.OK,
      'User account deactivated successfully',
      result
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('users/:userId/reactivate')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Reactivate user account (Admin only)',
    description: 'Reactivates any user account. Admin only endpoint.'
  })
  @ApiResponse({
    status: 200,
    description: 'User account reactivated successfully',
    type: SuccessResponse<MessageResponse>
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    type: ErrorResponse
  })
  async adminReactivateUser(@Req() req, @Param('userId') userId: string): Promise<SuccessResponse<MessageResponse>> {
    const result = await this.authService.reactivateAccount(userId);
    return new SuccessResponse(
      HttpStatus.OK,
      'User account reactivated successfully',
      result
    );
  }
}