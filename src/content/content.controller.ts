// src/content/content.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ContentService } from './content.service';
import {
  ContentResponseDto,
  CreateContentDto,
  UpdateContentDto,
  ContentListResponseDto,
  ContentQueryDto,
  ContentCategoriesResponseDto,
  ContentStatsResponseDto,
  UploadContentDto,
  StartReadingSessionResponseDto,
  EndReadingSessionResponseDto,
  CurrentReadersResponseDto,
  ContentAnalyticsResponseDto,
} from './content.dtos';
import { ContentType, UserRole } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SuccessResponse, ErrorResponse } from '../auth/auth.dtos';
import { GetUser } from '../auth/get-user.decorator';

@ApiTags('Content Management')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new content',
    description: 'Creates new content (books, videos, articles). Admin and Content Manager only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Content created successfully',
    type: SuccessResponse<ContentResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Content Manager access required',
    type: ErrorResponse,
  })
  async createContent(
    @Body() createContentDto: CreateContentDto,
  ): Promise<SuccessResponse<ContentResponseDto>> {
    const result = await this.contentService.createContent(createContentDto);
    return new SuccessResponse(
      HttpStatus.CREATED,
      'Content created successfully',
      result,
    );
  }

  @Post('upload')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT_MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload and create content with file',
    description: 'Uploads file to Cloudinary and creates content. Admin and Content Manager only.',
  })
  @ApiBody({
    description: 'Content file and data',
    type: UploadContentDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Content uploaded and created successfully',
    type: SuccessResponse<ContentResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or data',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Content Manager access required',
    type: ErrorResponse,
  })
  async uploadAndCreateContent(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100MB
          new FileTypeValidator({ fileType: /^(video|image|application)\/.*/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() uploadContentDto: UploadContentDto,
  ): Promise<SuccessResponse<ContentResponseDto>> {
    const result = await this.contentService.uploadAndCreateContent(file, uploadContentDto);
    return new SuccessResponse(
      HttpStatus.CREATED,
      'Content uploaded and created successfully',
      result,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all content',
    description: 'Retrieves all content with pagination and filtering.',
  })
  @ApiQuery({ name: 'type', required: false, enum: ContentType })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Content retrieved successfully',
    type: SuccessResponse<ContentListResponseDto>,
  })
  async getAllContent(
    @Query() query: ContentQueryDto,
  ): Promise<SuccessResponse<ContentListResponseDto>> {
    const result = await this.contentService.getAllContent(query);
    return new SuccessResponse(
      HttpStatus.OK,
      'Content retrieved successfully',
      result,
    );
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get content categories',
    description: 'Retrieves all available content categories.',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    type: SuccessResponse<ContentCategoriesResponseDto>,
  })
  async getContentCategories(): Promise<SuccessResponse<ContentCategoriesResponseDto>> {
    const result = await this.contentService.getContentCategories();
    return new SuccessResponse(
      HttpStatus.OK,
      'Categories retrieved successfully',
      result,
    );
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get content statistics',
    description: 'Retrieves content statistics. Admin and Content Manager only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: SuccessResponse<ContentStatsResponseDto>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Content Manager access required',
    type: ErrorResponse,
  })
  async getContentStats(): Promise<SuccessResponse<ContentStatsResponseDto>> {
    const result = await this.contentService.getContentStats();
    return new SuccessResponse(
      HttpStatus.OK,
      'Statistics retrieved successfully',
      result,
    );
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search content',
    description: 'Searches content by title, description, source, or category.',
  })
  @ApiQuery({ name: 'query', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Search completed successfully',
    type: SuccessResponse<ContentResponseDto[]>,
  })
  async searchContent(
    @Query('query') query: string,
    @Query('limit') limit: number = 10,
  ): Promise<SuccessResponse<ContentResponseDto[]>> {
    const result = await this.contentService.searchContent(query, limit);
    return new SuccessResponse(
      HttpStatus.OK,
      'Search completed successfully',
      result,
    );
  }

  @Get('category/:category')
  @ApiOperation({
    summary: 'Get content by category',
    description: 'Retrieves content filtered by specific category.',
  })
  @ApiQuery({ name: 'type', required: false, enum: ContentType })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Content retrieved successfully',
    type: SuccessResponse<ContentListResponseDto>,
  })
  async getContentByCategory(
    @Param('category') category: string,
    @Query() query: any,
  ): Promise<SuccessResponse<ContentListResponseDto>> {
    const result = await this.contentService.getContentByCategory(category, query);
    return new SuccessResponse(
      HttpStatus.OK,
      'Content retrieved successfully',
      result,
    );
  }

  @Get('random')
  @ApiOperation({
    summary: 'Get random content',
    description: 'Retrieves random content for daily tasks or recommendations.',
  })
  @ApiQuery({ name: 'type', required: true, enum: ContentType })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Random content retrieved successfully',
    type: SuccessResponse<ContentResponseDto[]>,
  })
  async getRandomContent(
    @Query('type') type: ContentType,
    @Query('limit') limit: number = 5,
  ): Promise<SuccessResponse<ContentResponseDto[]>> {
    const result = await this.contentService.getRandomContent(type, limit);
    return new SuccessResponse(
      HttpStatus.OK,
      'Random content retrieved successfully',
      result,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get content by ID',
    description: 'Retrieves specific content by its ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Content retrieved successfully',
    type: SuccessResponse<ContentResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Content not found',
    type: ErrorResponse,
  })
  async getContentById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SuccessResponse<ContentResponseDto>> {
    const result = await this.contentService.getContentById(id);
    return new SuccessResponse(
      HttpStatus.OK,
      'Content retrieved successfully',
      result,
    );
  }

  @Post(':id/read/start')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Start reading session',
    description: 'Starts a new reading session for the authenticated user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Reading session started',
    type: SuccessResponse<StartReadingSessionResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Content not found',
    type: ErrorResponse,
  })
  async startReadingSession(
    @GetUser('id') userId: string,
    @Param('id', ParseUUIDPipe) contentId: string,
  ): Promise<SuccessResponse<StartReadingSessionResponseDto>> {
    const result = await this.contentService.startReadingSession(userId, contentId);
    return new SuccessResponse(
      HttpStatus.CREATED,
      'Reading session started successfully',
      result,
    );
  }

  @Post('sessions/:sessionId/end')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'End reading session',
    description: 'Ends an active reading session.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reading session ended',
    type: SuccessResponse<EndReadingSessionResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
    type: ErrorResponse,
  })
  async endReadingSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<SuccessResponse<EndReadingSessionResponseDto>> {
    const result = await this.contentService.endReadingSession(sessionId);
    return new SuccessResponse(
      HttpStatus.OK,
      'Reading session ended successfully',
      result,
    );
  }

  @Get(':id/readers')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current readers for content',
    description: 'Retrieves current active readers for specific content. Admin and Content Manager only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current readers retrieved',
    type: SuccessResponse<CurrentReadersResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Content not found',
    type: ErrorResponse,
  })
  async getCurrentReaders(
    @Param('id', ParseUUIDPipe) contentId: string,
  ): Promise<SuccessResponse<CurrentReadersResponseDto>> {
    const result = await this.contentService.getCurrentReaders(contentId);
    return new SuccessResponse(
      HttpStatus.OK,
      'Current readers retrieved successfully',
      result,
    );
  }

  @Get(':id/analytics')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get content reading analytics',
    description: 'Retrieves detailed reading analytics for content. Admin and Content Manager only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved',
    type: SuccessResponse<ContentAnalyticsResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Content not found',
    type: ErrorResponse,
  })
  async getContentReadingAnalytics(
    @Param('id', ParseUUIDPipe) contentId: string,
  ): Promise<SuccessResponse<ContentAnalyticsResponseDto>> {
    const result = await this.contentService.getContentReadingAnalytics(contentId);
    return new SuccessResponse(
      HttpStatus.OK,
      'Content analytics retrieved successfully',
      result,
    );
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update content',
    description: 'Updates existing content. Admin and Content Manager only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Content updated successfully',
    type: SuccessResponse<ContentResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Content Manager access required',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Content not found',
    type: ErrorResponse,
  })
  async updateContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContentDto: UpdateContentDto,
  ): Promise<SuccessResponse<ContentResponseDto>> {
    const result = await this.contentService.updateContent(id, updateContentDto);
    return new SuccessResponse(
      HttpStatus.OK,
      'Content updated successfully',
      result,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete content (soft delete)',
    description: 'Soft deletes content by setting isActive to false. Admin and Content Manager only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Content deleted successfully',
    type: SuccessResponse<any>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Content Manager access required',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Content not found',
    type: ErrorResponse,
  })
  async deleteContent(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SuccessResponse<any>> {
    const result = await this.contentService.deleteContent(id);
    return new SuccessResponse(
      HttpStatus.OK,
      'Content deleted successfully',
      result,
    );
  }

  @Delete(':id/permanent')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Permanently delete content',
    description: 'Permanently deletes content from database. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Content permanently deleted',
    type: SuccessResponse<any>,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete content used in tasks',
    type: ErrorResponse,
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
  @ApiResponse({
    status: 404,
    description: 'Content not found',
    type: ErrorResponse,
  })
  async permanentDeleteContent(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SuccessResponse<any>> {
    const result = await this.contentService.permanentDeleteContent(id);
    return new SuccessResponse(
      HttpStatus.OK,
      'Content permanently deleted',
      result,
    );
  }

  @Post(':id/activate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activate content',
    description: 'Activates previously deactivated content. Admin and Content Manager only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Content activated successfully',
    type: SuccessResponse<ContentResponseDto>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Content Manager access required',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Content not found',
    type: ErrorResponse,
  })
  async activateContent(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SuccessResponse<ContentResponseDto>> {
    const result = await this.contentService.updateContent(id, { isActive: true });
    return new SuccessResponse(
      HttpStatus.OK,
      'Content activated successfully',
      result,
    );
  }
}