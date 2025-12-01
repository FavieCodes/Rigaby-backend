import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import {
  WalletBalanceResponse,
  TransactionListResponse,
  WithdrawalRequestDto,
  TransferFundsDto,
  WithdrawalResponse,
  TransactionQueryDto,
} from './wallet.dtos';
import { TransactionStatus, UserRole } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SuccessResponse, ErrorResponse } from '../auth/auth.dtos';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({
    summary: 'Get wallet balance',
    description: 'Retrieves the authenticated user\'s wallet balance including available and locked amounts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet balance retrieved successfully',
    type: SuccessResponse<WalletBalanceResponse>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Wallet not found',
    type: ErrorResponse,
  })
  async getWalletBalance(@Req() req): Promise<SuccessResponse<WalletBalanceResponse>> {
    const userId = req.user.userId || req.user.sub;
    
    // Validate that userId exists and is not undefined
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    const result = await this.walletService.getWalletWithBalance(userId); // FIXED: Changed from getWallet to getWalletWithBalance
    return new SuccessResponse(
      HttpStatus.OK,
      'Wallet balance retrieved successfully',
      result
    );
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Get wallet transactions',
    description: 'Retrieves the authenticated user\'s transaction history with pagination and filtering.',
  })
  @ApiQuery({ name: 'type', required: false, enum: TransactionStatus })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    type: SuccessResponse<TransactionListResponse>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  async getTransactions(
    @Req() req,
    @Query() query: TransactionQueryDto
  ): Promise<SuccessResponse<TransactionListResponse>> {
    const userId = req.user.userId || req.user.sub;
    
    // Validate that userId exists and is not undefined
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    const result = await this.walletService.getTransactions(userId, query);
    return new SuccessResponse(
      HttpStatus.OK,
      'Transactions retrieved successfully',
      result
    );
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request withdrawal',
    description: 'Submits a withdrawal request from the user\'s available balance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal request submitted successfully',
    type: SuccessResponse<WithdrawalResponse>,
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance or invalid amount',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  async requestWithdrawal(
    @Req() req,
    @Body() withdrawalDto: WithdrawalRequestDto
  ): Promise<SuccessResponse<WithdrawalResponse>> {
    const userId = req.user.userId || req.user.sub;
    
    // Validate that userId exists and is not undefined
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    const result = await this.walletService.requestWithdrawal(userId, withdrawalDto);
    return new SuccessResponse(
      HttpStatus.OK,
      'Withdrawal request submitted successfully',
      result
    );
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transfer funds to another user',
    description: 'Transfers funds from your wallet to another user\'s wallet.',
  })
  @ApiResponse({
    status: 200,
    description: 'Funds transferred successfully',
    type: SuccessResponse<any>,
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance or invalid transfer',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  async transferFunds(
    @Req() req,
    @Body() transferDto: TransferFundsDto
  ): Promise<SuccessResponse<any>> {
    const userId = req.user.userId || req.user.sub;
    
    // Validate that userId exists and is not undefined
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    const result = await this.walletService.transferFunds(userId, transferDto);
    return new SuccessResponse(
      HttpStatus.OK,
      'Funds transferred successfully',
      { transaction: result }
    );
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get wallet statistics',
    description: 'Retrieves wallet statistics including total earnings, withdrawals, and recent activity.',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet statistics retrieved successfully',
    type: SuccessResponse<any>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  async getWalletStats(@Req() req): Promise<SuccessResponse<any>> {
    const userId = req.user.userId || req.user.sub;
    
    // Validate that userId exists and is not undefined
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    const result = await this.walletService.getWalletStats(userId);
    return new SuccessResponse(
      HttpStatus.OK,
      'Wallet statistics retrieved successfully',
      result
    );
  }

  // Admin endpoints
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('withdrawals/:withdrawalId/process')
  @ApiOperation({
    summary: 'Process withdrawal (Admin only)',
    description: 'Approve or reject a withdrawal request. Admin only endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal processed successfully',
    type: SuccessResponse<any>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    type: ErrorResponse,
  })
  async processWithdrawal(
    @Param('withdrawalId') withdrawalId: string,
    @Body('status', new ParseEnumPipe(TransactionStatus)) status: TransactionStatus,
    @Body('adminNotes') adminNotes?: string
  ): Promise<SuccessResponse<any>> {
    const result = await this.walletService.processWithdrawal(withdrawalId, status, adminNotes);
    return new SuccessResponse(
      HttpStatus.OK,
      'Withdrawal processed successfully',
      { transaction: result }
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('withdrawals/pending')
  @ApiOperation({
    summary: 'Get pending withdrawals (Admin only)',
    description: 'Retrieves all pending withdrawal requests. Admin only endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending withdrawals retrieved successfully',
    type: SuccessResponse<any>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    type: ErrorResponse,
  })
  async getPendingWithdrawals(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ): Promise<SuccessResponse<any>> {
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      this.walletService['prisma'].transaction.findMany({
        where: {
          type: 'WITHDRAWAL',
          status: 'PENDING',
        },
        include: {
          wallet: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.walletService['prisma'].transaction.count({
        where: {
          type: 'WITHDRAWAL',
          status: 'PENDING',
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return new SuccessResponse(
      HttpStatus.OK,
      'Pending withdrawals retrieved successfully',
      {
        withdrawals,
        total,
        page,
        totalPages,
      }
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('platform/stats')
  @ApiOperation({
    summary: 'Get platform wallet statistics (Admin only)',
    description: 'Retrieves overall platform wallet statistics. Admin only endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Platform statistics retrieved successfully',
    type: SuccessResponse<any>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    type: ErrorResponse,
  })
  async getPlatformStats(): Promise<SuccessResponse<any>> {
    const result = await this.walletService.getPlatformWalletStats();
    return new SuccessResponse(
      HttpStatus.OK,
      'Platform statistics retrieved successfully',
      result
    );
  }
}