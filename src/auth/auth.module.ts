import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthStrategy, LocalAuthStrategy } from './auth.strategies';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { EmailModule } from '../email/email.module';
import { ReferralModule } from 'src/referral/referral.module';

@Module({
  imports: [
    PrismaModule,
    WalletModule,
    EmailModule,
    PassportModule,
    ConfigModule,
    ReferralModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: { 
        expiresIn: '1h' 
      },
    } as any), // Type assertion to fix the issue
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalAuthStrategy, JwtAuthStrategy],
  exports: [AuthService],
})
export class AuthModule {}