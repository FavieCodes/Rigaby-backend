import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

// Get Referral Tree Query DTO
export class GetReferralTreeQueryDto {
  @ApiProperty({ 
    required: false, 
    description: 'Maximum level depth for referral tree (default: 5)',
    example: 5,
    minimum: 1,
    maximum: 10
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxLevel?: number = 5;
}

// Referral Link Response DTO
export class ReferralLinkResponseDto {
  @ApiProperty({ example: 'cmij2l8tq0001z1e87y6gm685' })
  referralCode: string;

  @ApiProperty({ example: 'https://app.rigaby.com/register?ref=cmij2l8tq0001z1e87y6gm685' })
  referralLink: string;
}

// Referral Bonus Entity DTO
export class ReferralBonusEntityDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  level: number;

  @ApiProperty()
  type: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  metadata?: any;

  @ApiProperty()
  referredUser: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

// Referral Stats Response DTO
export class ReferralStatsResponseDto {
  @ApiProperty({ example: 15 })
  directReferrals: number;

  @ApiProperty({ example: 245.75 })
  totalBonus: number;

  @ApiProperty({ type: [ReferralBonusEntityDto] })
  recentBonuses: ReferralBonusEntityDto[];
}

// Referral Tree Node DTO
export class ReferralTreeNodeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  subscriptionTier: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: [ReferralTreeNodeDto] })
  referrals: ReferralTreeNodeDto[];
}

// Referral Tree Response DTO
export class ReferralTreeResponseDto {
  @ApiProperty({ type: ReferralTreeNodeDto })
  user: ReferralTreeNodeDto;
}

// Referral Analytics DTO
export class ReferralAnalyticsResponseDto {
  @ApiProperty()
  totalReferrals: number;

  @ApiProperty()
  activeReferrals: number;

  @ApiProperty()
  conversionRate: number;

  @ApiProperty()
  totalEarnings: number;

  @ApiProperty()
  subscriptionEarnings: number;

  @ApiProperty()
  taskEarnings: number;

  @ApiProperty()
  earningsByLevel: Array<{
    level: number;
    totalEarnings: number;
    referralCount: number;
  }>;
}