import { ApiProperty } from '@nestjs/swagger';

export class WalletEntity {
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

  constructor(partial: Partial<WalletEntity>) {
    Object.assign(this, partial);
  }
}

export class TransactionEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  walletId: string;

  @ApiProperty()
  type: string;

  @ApiProperty({ example: '50.00' })
  amount: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  metadata?: any;

  @ApiProperty()
  createdAt: Date;

  constructor(partial: Partial<TransactionEntity>) {
    Object.assign(this, partial);
  }
}