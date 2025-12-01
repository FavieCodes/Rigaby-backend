import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionTier, UserRole } from '@prisma/client';

class ReferrerEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false, nullable: true })
  phone?: string | null;

  @ApiProperty()
  referralCode: string;

  constructor(partial: Partial<ReferrerEntity>) {
    Object.assign(this, partial);
  }
}

export class UserEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false, nullable: true })
  phone?: string | null;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ enum: SubscriptionTier })
  subscriptionTier: SubscriptionTier;

  @ApiProperty()
  referralCode: string;

  @ApiProperty({ 
    required: false, 
    nullable: true,
    type: ReferrerEntity 
  })
  referrer?: ReferrerEntity | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isEmailVerified: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false, nullable: true })
  subscriptionExpiry?: Date | null;

  @ApiProperty()
  referralBonus: number;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}