import { Controller, Get, UseGuards, Req, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReferralService } from './referral.service';
import { 
  GetReferralTreeQueryDto,
  ReferralLinkResponseDto,
  ReferralStatsResponseDto,
  ReferralTreeResponseDto,
  ReferralAnalyticsResponseDto
} from './referral.dtos';

@ApiTags('Referral')
@Controller('referral')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ReferralController {
  private readonly logger = new Logger(ReferralController.name);

  constructor(private readonly referralService: ReferralService) {}

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get referral statistics',
    description: 'Retrieves the authenticated user\'s referral statistics including direct referrals, total bonus earned, and recent bonuses.'
  })
  @ApiResponse({
    status: 200,
    description: 'Referral statistics retrieved successfully',
    type: ReferralStatsResponseDto
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized'
  })
  async getReferralStats(@Req() req): Promise<ReferralStatsResponseDto> {
    try {
      this.logger.debug('User object:', req.user);
      
      const userId = req.user.id || req.user.sub || req.user.userId;
      
      if (!userId) {
        throw new HttpException('User ID not found in token', HttpStatus.BAD_REQUEST);
      }

      const stats = await this.referralService.getUserReferralStats(userId);
      return stats;
    } catch (error) {
      this.logger.error('Error getting referral stats:', error);
      throw new HttpException(
        error.message || 'Failed to get referral stats',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('tree')
  @ApiOperation({ 
    summary: 'Get referral tree',
    description: 'Retrieves the authenticated user\'s referral tree up to the specified level (default: 5 levels)'
  })
  @ApiResponse({
    status: 200,
    description: 'Referral tree retrieved successfully',
    type: ReferralTreeResponseDto
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized'
  })
  async getReferralTree(
    @Req() req, 
    @Query() query: GetReferralTreeQueryDto
  ): Promise<ReferralTreeResponseDto> {
    try {
      this.logger.debug('User object for tree:', req.user);
      
      const userId = req.user.id || req.user.sub || req.user.userId;
      
      if (!userId) {
        this.logger.error('User ID not found in request:', req.user);
        throw new HttpException('User ID not found in token', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`Fetching referral tree for user: ${userId}`);
      const tree = await this.referralService.getReferralTree(userId, query.maxLevel);
      
      if (!tree) {
        throw new HttpException('Failed to generate referral tree', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
      return { user: tree };
    } catch (error) {
      this.logger.error('Error getting referral tree:', error);
      throw new HttpException(
        error.message || 'Failed to get referral tree',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('link')
  @ApiOperation({ 
    summary: 'Get referral link',
    description: 'Retrieves the authenticated user\'s referral code and referral link'
  })
  @ApiResponse({
    status: 200,
    description: 'Referral link retrieved successfully',
    type: ReferralLinkResponseDto
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized'
  })
  async getReferralLink(@Req() req): Promise<ReferralLinkResponseDto> {
    try {
      const userId = req.user.id || req.user.sub || req.user.userId;
      
      if (!userId) {
        throw new HttpException('User ID not found in token', HttpStatus.BAD_REQUEST);
      }

      return this.referralService.getReferralLink(userId);
    } catch (error) {
      this.logger.error('Error getting referral link:', error);
      throw new HttpException(
        error.message || 'Failed to get referral link',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('analytics')
  @ApiOperation({ 
    summary: 'Get referral analytics',
    description: 'Retrieves detailed referral analytics including conversion rates and earnings breakdown.'
  })
  @ApiResponse({
    status: 200,
    description: 'Referral analytics retrieved successfully',
    // Use lazy type resolution to avoid runtime errors
    type: () => ReferralAnalyticsResponseDto
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized'
  })
  async getReferralAnalytics(@Req() req): Promise<ReferralAnalyticsResponseDto> {
    try {
      const userId = req.user.id || req.user.sub || req.user.userId;
      
      if (!userId) {
        throw new HttpException('User ID not found in token', HttpStatus.BAD_REQUEST);
      }

      const analytics = await this.referralService.getReferralAnalytics(userId);
      return analytics;
    } catch (error) {
      this.logger.error('Error getting referral analytics:', error);
      throw new HttpException(
        error.message || 'Failed to get referral analytics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}