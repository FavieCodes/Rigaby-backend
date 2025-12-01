import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';  // ADD THIS IMPORT
import { 
  ReferralLinkResponseDto,
  ReferralStatsResponseDto
} from './referral.dtos';
import { TransactionType } from '@prisma/client';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  private readonly bonusConfig = {
    directReferral: new Decimal(0.25), // 25%
    levels: [
      new Decimal(0.03), // Level 1: 3%
      new Decimal(0.02), // Level 2: 2%
      new Decimal(0.01), // Level 3: 1%
      new Decimal(0.01), // Level 4: 1%
      new Decimal(0.01), // Level 5: 1%
    ]
  };

  // Process referral bonus when user subscribes
  async processSubscriptionReferral(userId: string, subscriptionAmount: Decimal) {
    this.logger.log(`Processing subscription referral for user: ${userId}, amount: ${subscriptionAmount}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        referrer: {
          include: {
            wallet: true
          }
        }
      }
    });

    if (!user || !user.referredById) {
      this.logger.log(`No referrer found for user: ${userId}`);
      return null;
    }

    const directBonusAmount = subscriptionAmount.times(this.bonusConfig.directReferral);
    
    try {
      // Use WalletService to add funds to referrer's wallet
      await this.walletService.addFunds(
        user.referredById,
        Number(directBonusAmount),
        TransactionType.REFERRAL_BONUS,
        `Direct referral bonus from ${user.firstName} ${user.lastName}'s subscription`,
        {
          referredUserId: userId,
          level: 0,
          subscriptionAmount: subscriptionAmount.toString(),
          bonusPercentage: this.bonusConfig.directReferral.toString(),
          timestamp: new Date().toISOString()
        }
      );

      // Create direct referral bonus record - FIXED
      await this.prisma.referralBonus.create({
        data: {
          referrerId: user.referredById,
          referredUserId: userId,
          level: 0,
          bonusPercentage: this.bonusConfig.directReferral,
          amount: directBonusAmount,
          type: 'SUBSCRIPTION',
          status: 'PAID',
          metadata: {
            referredUserId: userId,
            level: 0,
            subscriptionAmount: subscriptionAmount.toString(),
            bonusPercentage: this.bonusConfig.directReferral.toString(),
            timestamp: new Date().toISOString()
          } as Prisma.JsonObject  // ADD THIS TYPE ASSERTION
        }
      });

      this.logger.log(`Direct referral bonus processed: ${directBonusAmount} for referrer: ${user.referredById}`);

      // Process multi-level referral bonuses
      await this.processMultiLevelReferral(user.referredById, userId, subscriptionAmount, 1);

      return {
        directBonus: directBonusAmount,
        referrerId: user.referredById
      };
    } catch (error) {
      this.logger.error(`Error processing subscription referral for user ${userId}:`, error);
      throw error;
    }
  }

  // Process multi-level referral bonuses (levels 1-5)
  private async processMultiLevelReferral(
    referrerId: string, 
    originalReferredUserId: string, 
    subscriptionAmount: Decimal, 
    currentLevel: number
  ) {
    if (currentLevel > this.bonusConfig.levels.length) {
      return;
    }

    const referrer = await this.prisma.user.findUnique({
      where: { id: referrerId },
      include: {
        wallet: true,
        referrer: {
          include: {
            wallet: true
          }
        }
      }
    });

    if (!referrer || !referrer.referredById) {
      return;
    }

    const levelBonusPercentage = this.bonusConfig.levels[currentLevel - 1];
    const levelBonusAmount = subscriptionAmount.times(levelBonusPercentage);

    try {
      // Use WalletService to add funds to level referrer's wallet
      await this.walletService.addFunds(
        referrer.referredById,
        Number(levelBonusAmount),
        TransactionType.REFERRAL_BONUS,
        `Level ${currentLevel} referral bonus from network`,
        {
          originalReferredUserId,
          level: currentLevel,
          subscriptionAmount: subscriptionAmount.toString(),
          bonusPercentage: levelBonusPercentage.toString(),
          timestamp: new Date().toISOString()
        }
      );

      // Create level referral bonus record - FIXED
      await this.prisma.referralBonus.create({
        data: {
          referrerId: referrer.referredById,
          referredUserId: originalReferredUserId,
          level: currentLevel,
          bonusPercentage: levelBonusPercentage,
          amount: levelBonusAmount,
          type: 'SUBSCRIPTION',
          status: 'PAID',
          metadata: {
            originalReferredUserId,
            level: currentLevel,
            subscriptionAmount: subscriptionAmount.toString(),
            bonusPercentage: levelBonusPercentage.toString(),
            timestamp: new Date().toISOString()
          } as Prisma.JsonObject  // ADD THIS TYPE ASSERTION
        }
      });

      this.logger.log(`Level ${currentLevel} referral bonus processed: ${levelBonusAmount} for referrer: ${referrer.referredById}`);

      // Process next level
      await this.processMultiLevelReferral(
        referrer.referredById, 
        originalReferredUserId, 
        subscriptionAmount, 
        currentLevel + 1
      );
    } catch (error) {
      this.logger.error(`Error processing level ${currentLevel} referral for referrer ${referrerId}:`, error);
      // Don't throw error here to prevent breaking the chain
    }
  }

  // Process task completion referral bonus
  async processTaskReferral(userId: string, taskReward: Decimal) {
    this.logger.log(`Processing task referral for user: ${userId}, reward: ${taskReward}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        referrer: {
          include: {
            wallet: true
          }
        }
      }
    });

    if (!user || !user.referredById) {
      this.logger.log(`No referrer found for user: ${userId}`);
      return null;
    }

    const taskBonusAmount = taskReward.times(this.bonusConfig.directReferral);

    try {
      // Use WalletService to add funds to referrer's wallet
      await this.walletService.addFunds(
        user.referredById,
        Number(taskBonusAmount),
        TransactionType.REFERRAL_BONUS,
        `Task completion bonus from ${user.firstName} ${user.lastName}`,
        {
          referredUserId: userId,
          taskReward: taskReward.toString(),
          bonusPercentage: this.bonusConfig.directReferral.toString(),
          timestamp: new Date().toISOString()
        }
      );

      // Create referral bonus record - FIXED
      await this.prisma.referralBonus.create({
        data: {
          referrerId: user.referredById,
          referredUserId: userId,
          level: 0,
          bonusPercentage: this.bonusConfig.directReferral,
          amount: taskBonusAmount,
          type: 'TASK_REWARD',
          status: 'PAID',
          metadata: {
            referredUserId: userId,
            taskReward: taskReward.toString(),
            bonusPercentage: this.bonusConfig.directReferral.toString(),
            timestamp: new Date().toISOString()
          } as Prisma.JsonObject  // ADD THIS TYPE ASSERTION
        }
      });

      this.logger.log(`Task referral bonus processed: ${taskBonusAmount} for referrer: ${user.referredById}`);

      return {
        taskBonus: taskBonusAmount,
        referrerId: user.referredById
      };
    } catch (error) {
      this.logger.error(`Error processing task referral for user ${userId}:`, error);
      throw error;
    }
  }

  // Get user's referral statistics
  async getUserReferralStats(userId: string): Promise<ReferralStatsResponseDto> {
    this.logger.log(`Getting referral stats for user: ${userId}`);

    const [directReferrals, totalBonus, referralBonuses, monthlyBonus] = await Promise.all([
      // Count direct referrals
      this.prisma.user.count({
        where: { referredById: userId }
      }),
      
      // Sum all referral bonuses
      this.prisma.referralBonus.aggregate({
        where: { referrerId: userId, status: 'PAID' },
        _sum: { amount: true }
      }),
      
      // Get recent referral bonuses
      this.prisma.referralBonus.findMany({
        where: { referrerId: userId },
        include: {
          referredUser: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              subscriptionTier: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Get monthly bonus (last 30 days)
      this.prisma.referralBonus.aggregate({
        where: { 
          referrerId: userId, 
          status: 'PAID',
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _sum: { amount: true }
      })
    ]);

    const stats = {
      directReferrals,
      totalBonus: Number(totalBonus._sum.amount || 0),
      monthlyBonus: Number(monthlyBonus._sum.amount || 0),
      recentBonuses: referralBonuses.map(bonus => ({
        id: bonus.id,
        amount: Number(bonus.amount),
        level: bonus.level,
        type: bonus.type,
        status: bonus.status,
        createdAt: bonus.createdAt,
        referredUser: bonus.referredUser,
        metadata: bonus.metadata
      }))
    };

    this.logger.log(`Referral stats for user ${userId}:`, stats);
    return stats;
  }

  // Get user's referral tree
  async getReferralTree(userId: string, maxLevel: number = 5) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    this.logger.log(`Getting referral tree for user: ${userId}, maxLevel: ${maxLevel}`);

    const getUserWithReferrals = async (id: string, currentLevel: number = 1): Promise<any> => {
      if (currentLevel > maxLevel || !id) {
        return null;
      }

      try {
        const user = await this.prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            subscriptionTier: true,
            createdAt: true,
            wallet: {
              select: {
                balance: true,
                locked: true
              }
            },
            referrals: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                subscriptionTier: true,
                createdAt: true,
                wallet: {
                  select: {
                    balance: true,
                    locked: true
                  }
                }
              }
            }
          }
        });

        if (!user) {
          return null;
        }

        const referralsWithChildren = await Promise.all(
          user.referrals.map(async (referral) => ({
            ...referral,
            balance: Number(referral.wallet?.balance || 0),
            locked: Number(referral.wallet?.locked || 0),
            referrals: await getUserWithReferrals(referral.id, currentLevel + 1)
          }))
        );

        return {
          ...user,
          balance: Number(user.wallet?.balance || 0),
          locked: Number(user.wallet?.locked || 0),
          referrals: referralsWithChildren
        };
      } catch (error) {
        this.logger.error(`Error fetching referrals for user ${id}:`, error);
        return null;
      }
    };

    return await getUserWithReferrals(userId);
  }

  async getReferralLink(userId: string): Promise<ReferralLinkResponseDto> {
    this.logger.log(`Getting referral link for user: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, firstName: true, lastName: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const referralLink = `${process.env.APP_URL || 'https://app.rigaby.com'}/register?ref=${user.referralCode}`;
    
    const result = {
      referralCode: user.referralCode,
      referralLink,
      shareMessage: `Join me on Rigaby! Use my referral code ${user.referralCode} to get started. ${referralLink}`
    };

    this.logger.log(`Generated referral link for user ${userId}: ${referralLink}`);
    return result;
  }

  // Get referral performance analytics
  async getReferralAnalytics(userId: string) {
    this.logger.log(`Getting referral analytics for user: ${userId}`);

    const [
      totalReferrals,
      activeReferrals,
      totalEarnings,
      subscriptionEarnings,
      taskEarnings,
      referralTiers
    ] = await Promise.all([
      // Total referrals count
      this.prisma.user.count({
        where: { referredById: userId }
      }),

      // Active referrals
      this.prisma.user.count({
        where: { 
          referredById: userId,
          isActive: true,
          isEmailVerified: true
        }
      }),

      // Total earnings
      this.prisma.referralBonus.aggregate({
        where: { 
          referrerId: userId,
          status: 'PAID'
        },
        _sum: { amount: true }
      }),

      // Subscription earnings
      this.prisma.referralBonus.aggregate({
        where: { 
          referrerId: userId,
          type: 'SUBSCRIPTION',
          status: 'PAID'
        },
        _sum: { amount: true }
      }),

      // Task earnings
      this.prisma.referralBonus.aggregate({
        where: { 
          referrerId: userId,
          type: 'TASK_REWARD',
          status: 'PAID'
        },
        _sum: { amount: true }
      }),

      // Earnings by level
      this.prisma.referralBonus.groupBy({
        by: ['level'],
        where: { 
          referrerId: userId,
          status: 'PAID'
        },
        _sum: { amount: true },
        _count: { id: true }
      })
    ]);

    return {
      totalReferrals,
      activeReferrals,
      conversionRate: totalReferrals > 0 ? (activeReferrals / totalReferrals) * 100 : 0,
      totalEarnings: Number(totalEarnings._sum.amount || 0),
      subscriptionEarnings: Number(subscriptionEarnings._sum.amount || 0),
      taskEarnings: Number(taskEarnings._sum.amount || 0),
      earningsByLevel: referralTiers.map(tier => ({
        level: tier.level,
        totalEarnings: Number(tier._sum.amount || 0),
        referralCount: tier._count.id
      }))
    };
  }
}