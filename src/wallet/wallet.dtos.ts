import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TransactionType, TransactionStatus } from '@prisma/client';

// Wallet Response DTO
export class WalletResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ example: '100.50' })
  balance: string;

  @ApiProperty({ example: '25.00' })
  locked: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<WalletResponseDto>) {
    Object.assign(this, partial);
  }
}

// Transaction Response DTO
export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  walletId: string;

  @ApiProperty({ enum: TransactionType })
  type: TransactionType;

  @ApiProperty({ example: '50.00' })
  amount: string;

  @ApiProperty({ example: 'Task completion reward' })
  description: string;

  @ApiProperty({ enum: TransactionStatus })
  status: TransactionStatus;

  @ApiProperty({ required: false })
  metadata?: any;

  @ApiProperty()
  createdAt: Date;

  constructor(partial: Partial<TransactionResponseDto>) {
    Object.assign(this, partial);
  }
}

// Withdrawal Request DTO
export class WithdrawalRequestDto {
  @ApiProperty({ example: 50.00, minimum: 1 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'bank_transfer' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  accountDetails: string;
}

// Fund Transfer DTO
export class TransferFundsDto {
  @ApiProperty({ example: 25.00, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'recipient@email.com' })
  @IsString()
  @IsNotEmpty()
  recipientEmail: string;

  @ApiProperty({ example: 'Payment for services' })
  @IsString()
  @IsOptional()
  description?: string;
}

// Transaction Query DTO
export class TransactionQueryDto {
  @ApiProperty({ required: false, enum: TransactionType })
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @ApiProperty({ required: false, enum: TransactionStatus })
  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}

// Standardized Response DTOs
export class WalletBalanceResponse {
  @ApiProperty()
  wallet: WalletResponseDto;

  @ApiProperty({ example: '125.50' })
  totalBalance: string;

  @ApiProperty({ example: '100.50' })
  availableBalance: string;

  @ApiProperty({ example: '25.00' })
  lockedBalance: string;
}

export class TransactionListResponse {
  @ApiProperty({ type: [TransactionResponseDto] })
  transactions: TransactionResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  totalPages: number;
}

export class WithdrawalResponse {
  @ApiProperty()
  transaction: TransactionResponseDto;

  @ApiProperty()
  newBalance: string;

  @ApiProperty()
  message: string;
}