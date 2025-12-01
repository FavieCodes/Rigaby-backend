import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  WalletResponseDto,
  TransactionResponseDto,
  WithdrawalRequestDto,
  TransferFundsDto,
  WalletBalanceResponse,
  TransactionListResponse,
  WithdrawalResponse
} from './wallet.dtos';
import { TransactionType, TransactionStatus } from '@prisma/client';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new wallet for user
   */
  async createWallet(userId: string) {
    this.logger.log(`Creating wallet for user: ${userId}`);
    return this.prisma.wallet.create({
      data: {
        userId,
        balance: 0,
        locked: 0,
      },
    });
  }

  /**
   * Get user's wallet
   */
  async getWallet(userId: string) {
    return this.prisma.wallet.findUnique({
      where: { userId },
    });
  }

  /**
   * Update wallet balance
   */
  async updateBalance(userId: string, amount: number) {
    return this.prisma.wallet.update({
      where: { userId },
      data: {
        balance: {
          increment: amount,
        },
      },
    });
  }

  /**
   * Get user's wallet with balance information
   */
  async getWalletWithBalance(userId: string): Promise<WalletBalanceResponse> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const totalBalance = Number(wallet.balance) + Number(wallet.locked);
    const availableBalance = Number(wallet.balance);
    const lockedBalance = Number(wallet.locked);

    return {
      wallet: new WalletResponseDto({
        ...wallet,
        balance: wallet.balance.toString(),
        locked: wallet.locked.toString(),
      }),
      totalBalance: totalBalance.toFixed(2),
      availableBalance: availableBalance.toFixed(2),
      lockedBalance: lockedBalance.toFixed(2),
    };
  }

  /**
   * Get wallet transactions with pagination and filtering
   */
  async getTransactions(
    userId: string, 
    query: any
  ): Promise<TransactionListResponse> {
    const { type, status, startDate, endDate, page = 1, limit = 20 } = query;
    
    const skip = (page - 1) * limit;

    // Get user's wallet first
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Build where clause for filtering
    const where: any = {
      walletId: wallet.id,
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      transactions: transactions.map(transaction => 
        new TransactionResponseDto({
          ...transaction,
          amount: transaction.amount.toString(),
        })
      ),
      total,
      page,
      totalPages,
    };
  }

  /**
   * Create a withdrawal request
   */
  async requestWithdrawal(
    userId: string, 
    withdrawalDto: WithdrawalRequestDto
  ): Promise<WithdrawalResponse> {
    const { amount, paymentMethod, accountDetails } = withdrawalDto;

    return await this.prisma.$transaction(async (tx) => {
      // Get and lock wallet for update
      const wallet = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true, balance: true, locked: true },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const availableBalance = Number(wallet.balance);
      
      // Validate sufficient balance
      if (availableBalance < amount) {
        throw new BadRequestException('Insufficient balance for withdrawal');
      }

      // Validate minimum withdrawal amount
      if (amount < 1) {
        throw new BadRequestException('Minimum withdrawal amount is $1');
      }

      // Update wallet balance
      const newBalance = availableBalance - amount;
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { 
          balance: newBalance,
          locked: Number(wallet.locked) + amount, // Lock the withdrawn amount
        },
      });

      // Create withdrawal transaction
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.WITHDRAWAL,
          amount: amount,
          description: `Withdrawal via ${paymentMethod}`,
          status: TransactionStatus.PENDING,
          metadata: {
            paymentMethod,
            accountDetails,
            requestedAt: new Date(),
          },
        },
      });

      return {
        transaction: new TransactionResponseDto({
          ...transaction,
          amount: transaction.amount.toString(),
        }),
        newBalance: newBalance.toFixed(2),
        message: 'Withdrawal request submitted successfully',
      };
    });
  }

  /**
   * Transfer funds to another user
   */
  async transferFunds(
    userId: string, 
    transferDto: TransferFundsDto
  ): Promise<TransactionResponseDto> {
    const { amount, recipientEmail, description } = transferDto;

    return await this.prisma.$transaction(async (tx) => {
      // Get sender's wallet
      const senderWallet = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true, balance: true },
      });

      if (!senderWallet) {
        throw new NotFoundException('Sender wallet not found');
      }

      // Check if sender has sufficient balance
      if (Number(senderWallet.balance) < amount) {
        throw new BadRequestException('Insufficient balance for transfer');
      }

      // Find recipient by email
      const recipient = await tx.user.findUnique({
        where: { email: recipientEmail },
        include: { wallet: true },
      });

      if (!recipient) {
        throw new NotFoundException('Recipient not found');
      }

      if (!recipient.wallet) {
        throw new NotFoundException('Recipient wallet not found');
      }

      if (recipient.id === userId) {
        throw new BadRequestException('Cannot transfer funds to yourself');
      }

      // Update sender's balance
      const newSenderBalance = Number(senderWallet.balance) - amount;
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: newSenderBalance },
      });

      // Update recipient's balance
      const newRecipientBalance = Number(recipient.wallet.balance) + amount;
      await tx.wallet.update({
        where: { id: recipient.wallet.id },
        data: { balance: newRecipientBalance },
      });

      // Create transaction for sender (debit)
      const senderTransaction = await tx.transaction.create({
        data: {
          walletId: senderWallet.id,
          type: TransactionType.WITHDRAWAL,
          amount: amount,
          description: description || `Transfer to ${recipientEmail}`,
          status: TransactionStatus.COMPLETED,
          metadata: {
            transferType: 'peer_to_peer',
            recipientEmail,
            recipientName: `${recipient.firstName} ${recipient.lastName}`,
          },
        },
      });

      // Create transaction for recipient (credit)
      await tx.transaction.create({
        data: {
          walletId: recipient.wallet.id,
          type: TransactionType.TASK_REWARD, // Using task reward type for incoming transfers
          amount: amount,
          description: `Transfer from user`,
          status: TransactionStatus.COMPLETED,
          metadata: {
            transferType: 'peer_to_peer',
            senderId: userId,
            senderName: `${recipient.firstName} ${recipient.lastName}`,
          },
        },
      });

      return new TransactionResponseDto({
        ...senderTransaction,
        amount: senderTransaction.amount.toString(),
      });
    });
  }

  /**
   * Add funds to wallet (for admin/task rewards/referral bonuses)
   */
  async addFunds(
    userId: string,
    amount: number,
    type: TransactionType,
    description: string,
    metadata?: any
  ): Promise<TransactionResponseDto> {
    return await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      // Update wallet balance
      const newBalance = Number(wallet.balance) + amount;
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount,
          description,
          status: TransactionStatus.COMPLETED,
          metadata,
        },
      });

      return new TransactionResponseDto({
        ...transaction,
        amount: transaction.amount.toString(),
      });
    });
  }

  /**
   * Lock funds in wallet (for pending transactions)
   */
  async lockFunds(
    userId: string,
    amount: number,
    description: string,
    metadata?: any
  ): Promise<TransactionResponseDto> {
    return await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const availableBalance = Number(wallet.balance);
      if (availableBalance < amount) {
        throw new BadRequestException('Insufficient balance to lock funds');
      }

      // Move funds from balance to locked
      const newBalance = availableBalance - amount;
      const newLocked = Number(wallet.locked) + amount;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { 
          balance: newBalance,
          locked: newLocked,
        },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.WITHDRAWAL,
          amount: amount,
          description,
          status: TransactionStatus.PENDING,
          metadata: {
            ...metadata,
            lockType: 'funds_locked',
          },
        },
      });

      return new TransactionResponseDto({
        ...transaction,
        amount: transaction.amount.toString(),
      });
    });
  }

  /**
   * Unlock funds in wallet
   */
  async unlockFunds(
    userId: string,
    amount: number,
    description: string,
    metadata?: any
  ): Promise<TransactionResponseDto> {
    return await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const lockedBalance = Number(wallet.locked);
      if (lockedBalance < amount) {
        throw new BadRequestException('Insufficient locked funds to unlock');
      }

      // Move funds from locked to balance
      const newBalance = Number(wallet.balance) + amount;
      const newLocked = lockedBalance - amount;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { 
          balance: newBalance,
          locked: newLocked,
        },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.TASK_REWARD,
          amount: amount,
          description,
          status: TransactionStatus.COMPLETED,
          metadata: {
            ...metadata,
            unlockType: 'funds_unlocked',
          },
        },
      });

      return new TransactionResponseDto({
        ...transaction,
        amount: transaction.amount.toString(),
      });
    });
  }

  /**
   * Admin: Process withdrawal (approve/reject)
   */
  async processWithdrawal(
    withdrawalId: string,
    status: TransactionStatus,
    adminNotes?: string
  ): Promise<TransactionResponseDto> {
    return await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: withdrawalId },
        include: { wallet: true },
      });

      if (!transaction) {
        throw new NotFoundException('Withdrawal transaction not found');
      }

      if (transaction.type !== TransactionType.WITHDRAWAL) {
        throw new BadRequestException('Transaction is not a withdrawal');
      }

      if (transaction.status !== TransactionStatus.PENDING) {
        throw new BadRequestException('Withdrawal already processed');
      }

      // Update transaction status
      const updatedTransaction = await tx.transaction.update({
        where: { id: withdrawalId },
        data: { 
          status,
          metadata: {
            ...(transaction.metadata as any),
            processedAt: new Date(),
            adminNotes,
          },
        },
      });

      // If rejected, return funds to available balance
      if (status === TransactionStatus.FAILED) {
        const wallet = await tx.wallet.findUnique({
          where: { id: transaction.walletId },
        });

        if (wallet) {
          await tx.wallet.update({
            where: { id: transaction.walletId },
            data: {
              balance: Number(wallet.balance) + Number(transaction.amount),
              locked: Number(wallet.locked) - Number(transaction.amount),
            },
          });
        }
      }

      // If approved, keep funds locked (they will be paid out externally)
      if (status === TransactionStatus.COMPLETED) {
        const wallet = await tx.wallet.findUnique({
          where: { id: transaction.walletId },
        });

        if (wallet) {
          await tx.wallet.update({
            where: { id: transaction.walletId },
            data: {
              locked: Number(wallet.locked) - Number(transaction.amount),
            },
          });
        }
      }

      return new TransactionResponseDto({
        ...updatedTransaction,
        amount: updatedTransaction.amount.toString(),
      });
    });
  }

  /**
   * Get wallet statistics for dashboard
   */
  async getWalletStats(userId: string): Promise<any> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Calculate total earnings
    const totalEarnings = await this.prisma.transaction.aggregate({
      where: {
        walletId: wallet.id,
        type: {
          in: [TransactionType.TASK_REWARD, TransactionType.REFERRAL_BONUS, TransactionType.TOURNAMENT_WIN],
        },
        status: TransactionStatus.COMPLETED,
      },
      _sum: { amount: true },
    });

    // Calculate total withdrawals
    const totalWithdrawals = await this.prisma.transaction.aggregate({
      where: {
        walletId: wallet.id,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.COMPLETED,
      },
      _sum: { amount: true },
    });

    // Recent activity
    const recentTransactions = wallet.transactions.slice(0, 5);

    return {
      totalEarnings: Number(totalEarnings._sum.amount || 0),
      totalWithdrawals: Number(totalWithdrawals._sum.amount || 0),
      currentBalance: Number(wallet.balance),
      lockedBalance: Number(wallet.locked),
      recentTransactions: recentTransactions.map(tx => 
        new TransactionResponseDto({
          ...tx,
          amount: tx.amount.toString(),
        })
      ),
    };
  }

  /**
   * Get total platform wallet statistics (Admin only)
   */
  async getPlatformWalletStats(): Promise<any> {
    const [totalWallets, totalBalance, totalLocked, recentTransactions] = await Promise.all([
      this.prisma.wallet.count(),
      this.prisma.wallet.aggregate({
        _sum: { balance: true },
      }),
      this.prisma.wallet.aggregate({
        _sum: { locked: true },
      }),
      this.prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          wallet: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      totalWallets,
      totalBalance: Number(totalBalance._sum.balance || 0),
      totalLocked: Number(totalLocked._sum.locked || 0),
      totalPlatformValue: Number(totalBalance._sum.balance || 0) + Number(totalLocked._sum.locked || 0),
      recentTransactions: recentTransactions.map(tx => ({
        ...tx,
        amount: tx.amount.toString(),
        user: tx.wallet.user,
      })),
    };
  }
}