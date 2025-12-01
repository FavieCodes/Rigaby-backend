import { ApiProperty } from '@nestjs/swagger';

class ReferralBonusEntity {
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
  referredUser: {
    firstName: string;
    lastName: string;
    email: string;
  };

  constructor(partial: Partial<ReferralBonusEntity>) {
    Object.assign(this, partial);
  }
}

export class ReferralStatsEntity {
  @ApiProperty()
  directReferrals: number;

  @ApiProperty()
  totalBonus: number;

  @ApiProperty({ type: [ReferralBonusEntity] })
  recentBonuses: ReferralBonusEntity[];

  constructor(partial: Partial<ReferralStatsEntity>) {
    Object.assign(this, partial);
  }
}