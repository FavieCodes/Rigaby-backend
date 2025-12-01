// src/content/content.service.ts
import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ConflictException,
  Logger 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { 
  ContentResponseDto,
  CreateContentDto,
  UpdateContentDto,
  UploadContentDto,
  ContentListResponseDto,
  ContentCategoriesResponseDto,
  ContentStatsResponseDto,
  CloudinaryUploadResponseDto,
  ContentAnalyticsResponseDto
} from './content.dtos';
import { ContentType } from '@prisma/client';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Map Prisma content to ContentResponseDto
   */
  private mapContentToDto(content: any): ContentResponseDto {
    return new ContentResponseDto({
      ...content,
      description: content.description ?? undefined,
      source: content.source ?? undefined,
      duration: content.duration ?? undefined,
      pages: content.pages ?? undefined,
      fileUrl: content.fileUrl ?? undefined,
      thumbnailUrl: content.thumbnailUrl ?? undefined,
      publicId: content.publicId ?? undefined, // Convert null to undefined
    });
  }

  /**
   * Create new content
   */
  async createContent(createContentDto: CreateContentDto): Promise<ContentResponseDto> {
    this.logger.log('Creating new content');

    try {
      // Validate content based on type
      this.validateContentByType(createContentDto);

      const content = await this.prisma.content.create({
        data: {
          ...createContentDto,
          isActive: createContentDto.isActive ?? true,
          readCount: 0,
          currentReaders: 0,
        },
      });

      this.logger.log(`Content created successfully: ${content.id}`);
      return this.mapContentToDto(content);
    } catch (error) {
      this.logger.error('Error creating content:', error);
      if (error.code === 'P2002') {
        throw new ConflictException('Content with similar attributes already exists');
      }
      throw error;
    }
  }

  /**
   * Upload and create content with file
   */
  async uploadAndCreateContent(
    file: Express.Multer.File,
    uploadContentDto: UploadContentDto,
  ): Promise<ContentResponseDto> {
    this.logger.log(`Uploading content file: ${file.originalname}`);

    try {
      // Validate file type
      this.validateFileType(file, uploadContentDto.type);

      let uploadResult: CloudinaryUploadResponseDto;
      let thumbnailUrl: string | undefined;

      // Upload based on content type
      if (uploadContentDto.type === ContentType.VIDEO) {
        uploadResult = await this.cloudinaryService.uploadVideo(file);
        // Generate thumbnail for videos
        thumbnailUrl = await this.cloudinaryService.generateThumbnail(uploadResult.secure_url);
      } else if (uploadContentDto.type === ContentType.BOOK) {
        uploadResult = await this.cloudinaryService.uploadDocument(file);
      } else {
        uploadResult = await this.cloudinaryService.uploadFile(file);
      }

      // Create content record
      const content = await this.prisma.content.create({
        data: {
          ...uploadContentDto,
          fileUrl: uploadResult.secure_url,
          thumbnailUrl,
          publicId: uploadResult.public_id,
          isActive: uploadContentDto.isActive ?? true,
          readCount: 0,
          currentReaders: 0,
          metadata: {
            ...uploadContentDto.metadata,
            fileSize: uploadResult.bytes,
            fileFormat: uploadResult.format,
            uploadInfo: uploadResult,
          },
        },
      });

      this.logger.log(`Content uploaded and created successfully: ${content.id}`);
      return this.mapContentToDto(content);
    } catch (error) {
      this.logger.error('Error uploading content:', error);
      throw error;
    }
  }

  /**
   * Get all content with pagination and filtering
   */
  async getAllContent(query: any): Promise<ContentListResponseDto> {
    const { type, category, search, isActive = true, page = 1, limit = 20 } = query;
    
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = { isActive };

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = {
        contains: category,
        mode: 'insensitive'
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { source: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [contents, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.content.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    return {
      contents: contents.map(content => this.mapContentToDto(content)),
      total,
      page,
      totalPages,
      hasNext,
      hasPrevious,
    };
  }

  /**
   * Get content by ID
   */
  async getContentById(id: string): Promise<ContentResponseDto> {
    this.logger.log(`Getting content by ID: ${id}`);

    const content = await this.prisma.content.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    return this.mapContentToDto(content);
  }

  /**
   * Start reading session
   */
  async startReadingSession(userId: string, contentId: string): Promise<{ message: string; sessionId: string }> {
    this.logger.log(`Starting reading session for user ${userId} on content ${contentId}`);

    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    // Check for existing active session
    const existingSession = await this.prisma.readingSession.findFirst({
      where: {
        userId,
        contentId,
        isActive: true,
      },
    });

    if (existingSession) {
      return { message: 'Reading session already active', sessionId: existingSession.id };
    }

    // Create new reading session
    const session = await this.prisma.readingSession.create({
      data: {
        userId,
        contentId,
        isActive: true,
      },
    });

    // Update content read count and current readers
    await this.prisma.content.update({
      where: { id: contentId },
      data: {
        readCount: { increment: 1 },
        currentReaders: { increment: 1 },
      },
    });

    this.logger.log(`Reading session started: ${session.id}`);
    return { message: 'Reading session started', sessionId: session.id };
  }

  /**
   * End reading session
   */
  async endReadingSession(sessionId: string): Promise<{ message: string; duration: number }> {
    this.logger.log(`Ending reading session: ${sessionId}`);

    const session = await this.prisma.readingSession.findUnique({
      where: { id: sessionId },
      include: { content: true },
    });

    if (!session) {
      throw new NotFoundException('Reading session not found');
    }

    if (!session.isActive) {
      throw new BadRequestException('Reading session already ended');
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000); // Duration in seconds

    // Update session
    await this.prisma.readingSession.update({
      where: { id: sessionId },
      data: {
        endTime,
        duration,
        isActive: false,
      },
    });

    // Update content current readers
    await this.prisma.content.update({
      where: { id: session.contentId },
      data: {
        currentReaders: { decrement: 1 },
      },
    });

    this.logger.log(`Reading session ended: ${sessionId}, duration: ${duration}s`);
    return { message: 'Reading session ended', duration };
  }

  /**
   * Get current readers for content
   */
  async getCurrentReaders(contentId: string): Promise<{ currentReaders: number; readers: any[] }> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { currentReaders: true },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    const activeSessions = await this.prisma.readingSession.findMany({
      where: {
        contentId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    return {
      currentReaders: content.currentReaders,
      readers: activeSessions.map(session => ({
        userId: session.userId,
        userName: `${session.user.firstName} ${session.user.lastName}`,
        userEmail: session.user.email,
        startTime: session.startTime,
      })),
    };
  }

  /**
   * Get content reading analytics
   */
  async getContentReadingAnalytics(contentId: string): Promise<ContentAnalyticsResponseDto> {
    const [content, readingSessions, averageDuration] = await Promise.all([
      this.prisma.content.findUnique({
        where: { id: contentId },
      }),
      this.prisma.readingSession.findMany({
        where: { contentId },
        orderBy: { startTime: 'desc' },
        take: 100, // Last 100 sessions
      }),
      this.prisma.readingSession.aggregate({
        where: {
          contentId,
          duration: { not: null },
        },
        _avg: { duration: true },
      }),
    ]);

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    const totalReadingTime = readingSessions.reduce((total, session) => 
      total + (session.duration || 0), 0
    );

    const sessionsByDay = readingSessions.reduce((acc, session) => {
      const date = session.startTime.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Convert null values to undefined for DTO compatibility
    const recentSessions = readingSessions.slice(0, 10).map(session => ({
      id: session.id,
      userId: session.userId,
      startTime: session.startTime,
      endTime: session.endTime || undefined,
      duration: session.duration || undefined,
    }));

    return {
      contentId,
      totalReads: content.readCount,
      currentReaders: content.currentReaders,
      totalReadingTime, // in seconds
      averageReadingTime: averageDuration._avg.duration || 0,
      readingSessions: readingSessions.length,
      sessionsByDay,
      recentSessions,
    };
  }

  /**
   * Update content
   */
  async updateContent(id: string, updateContentDto: UpdateContentDto): Promise<ContentResponseDto> {
    this.logger.log(`Updating content: ${id}`);

    // Check if content exists
    const existingContent = await this.prisma.content.findUnique({
      where: { id },
    });

    if (!existingContent) {
      throw new NotFoundException('Content not found');
    }

    // Validate content based on type if type is being updated
    if (updateContentDto.type) {
      this.validateContentByType({ ...existingContent, ...updateContentDto });
    }

    const updatedContent = await this.prisma.content.update({
      where: { id },
      data: updateContentDto,
    });

    this.logger.log(`Content updated successfully: ${id}`);
    return this.mapContentToDto(updatedContent);
  }

  /**
   * Delete content (soft delete by setting isActive to false)
   */
  async deleteContent(id: string): Promise<{ message: string }> {
    this.logger.log(`Deleting content: ${id}`);

    const content = await this.prisma.content.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    await this.prisma.content.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Content deleted successfully: ${id}`);
    return { message: 'Content deleted successfully' };
  }

  /**
   * Permanently delete content (admin only)
   */
  async permanentDeleteContent(id: string): Promise<{ message: string }> {
    this.logger.log(`Permanently deleting content: ${id}`);

    const content = await this.prisma.content.findUnique({
      where: { id },
      include: {
        tasks: true,
        readingSessions: true,
      }
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    // Check if content is used in any tasks
    if (content.tasks.length > 0) {
      throw new BadRequestException('Cannot delete content that is used in tasks');
    }

    // Delete from Cloudinary if file exists
    if (content.publicId) {
      const resourceType = content.type === ContentType.VIDEO ? 'video' : 
                          content.type === ContentType.BOOK ? 'raw' : 'image';
      await this.cloudinaryService.deleteFile(content.publicId, resourceType);
    }

    // Delete reading sessions first
    await this.prisma.readingSession.deleteMany({
      where: { contentId: id },
    });

    // Delete content
    await this.prisma.content.delete({
      where: { id },
    });

    this.logger.log(`Content permanently deleted: ${id}`);
    return { message: 'Content permanently deleted' };
  }

  /**
   * Get all content categories
   */
  async getContentCategories(): Promise<ContentCategoriesResponseDto> {
    this.logger.log('Getting all content categories');

    const categories = await this.prisma.content.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
    });

    const categoryList = categories.map(c => c.category).filter(Boolean);
    
    return {
      categories: categoryList,
      totalCategories: categoryList.length,
    };
  }

  /**
   * Get content statistics
   */
  async getContentStats(): Promise<ContentStatsResponseDto> {
    this.logger.log('Getting content statistics');

    const [
      totalContent,
      activeContent,
      booksCount,
      videosCount,
      articlesCount,
      categories,
      totalPages,
      totalDuration,
      totalReads,
      averageReadTime
    ] = await Promise.all([
      this.prisma.content.count(),
      this.prisma.content.count({ where: { isActive: true } }),
      this.prisma.content.count({ where: { type: 'BOOK', isActive: true } }),
      this.prisma.content.count({ where: { type: 'VIDEO', isActive: true } }),
      this.prisma.content.count({ where: { type: 'ARTICLE', isActive: true } }),
      this.prisma.content.findMany({
        where: { isActive: true },
        select: { category: true },
        distinct: ['category'],
      }),
      this.prisma.content.aggregate({
        where: { isActive: true },
        _sum: { pages: true },
      }),
      this.prisma.content.aggregate({
        where: { isActive: true },
        _sum: { duration: true },
      }),
      this.prisma.content.aggregate({
        where: { isActive: true },
        _sum: { readCount: true },
      }),
      this.prisma.readingSession.aggregate({
        where: { duration: { not: null } },
        _avg: { duration: true },
      }),
    ]);

    return {
      totalContent,
      activeContent,
      booksCount,
      videosCount,
      articlesCount,
      categoriesCount: categories.length,
      totalPages: Number(totalPages._sum.pages || 0),
      totalDuration: Number(totalDuration._sum.duration || 0),
      totalReads: Number(totalReads._sum.readCount || 0),
      averageReadTime: Number(averageReadTime._avg.duration || 0),
    };
  }

  /**
   * Get random content for daily tasks
   */
  async getRandomContent(type: ContentType, limit: number = 5): Promise<ContentResponseDto[]> {
    this.logger.log(`Getting random ${type} content, limit: ${limit}`);

    // Using raw query for random sampling (more efficient than orderBy random)
    const randomContent = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM "contents" 
      WHERE "isActive" = true 
      AND "type" = $1 
      ORDER BY RANDOM() 
      LIMIT $2
    `, type, limit);

    return (randomContent as any[]).map(content => this.mapContentToDto(content));
  }

  /**
   * Search content by title, description, or source
   */
  async searchContent(query: string, limit: number = 10): Promise<ContentResponseDto[]> {
    this.logger.log(`Searching content with query: ${query}`);

    const contents = await this.prisma.content.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { source: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return contents.map(content => this.mapContentToDto(content));
  }

  /**
   * Validate content based on type
   */
  private validateContentByType(content: CreateContentDto | any): void {
    switch (content.type) {
      case ContentType.BOOK:
        if (!content.pages || content.pages < 1) {
          throw new BadRequestException('Book content must have at least 1 page');
        }
        if (!content.content && !content.fileUrl) {
          throw new BadRequestException('Book content must have content text or file');
        }
        break;

      case ContentType.VIDEO:
        if (!content.duration || content.duration < 1) {
          throw new BadRequestException('Video content must have duration');
        }
        if (!content.fileUrl) {
          throw new BadRequestException('Video content must have a file');
        }
        break;

      case ContentType.ARTICLE:
        if (!content.content) {
          throw new BadRequestException('Article content must have content text');
        }
        break;

      default:
        throw new BadRequestException(`Unsupported content type: ${content.type}`);
    }
  }

  /**
   * Validate file type
   */
  private validateFileType(file: Express.Multer.File, contentType: ContentType): void {
    const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm'];
    const allowedDocumentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    switch (contentType) {
      case ContentType.VIDEO:
        if (!allowedVideoTypes.includes(file.mimetype)) {
          throw new BadRequestException(`Invalid video file type. Allowed: ${allowedVideoTypes.join(', ')}`);
        }
        break;
      case ContentType.BOOK:
        if (!allowedDocumentTypes.includes(file.mimetype)) {
          throw new BadRequestException(`Invalid document file type. Allowed: ${allowedDocumentTypes.join(', ')}`);
        }
        break;
      case ContentType.ARTICLE:
        if (!allowedImageTypes.includes(file.mimetype)) {
          throw new BadRequestException(`Invalid image file type. Allowed: ${allowedImageTypes.join(', ')}`);
        }
        break;
    }
  }

  /**
   * Get content by category
   */
  async getContentByCategory(category: string, query: any): Promise<ContentListResponseDto> {
    const { type, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
      category: {
        contains: category,
        mode: 'insensitive'
      }
    };

    if (type) {
      where.type = type;
    }

    const [contents, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.content.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    return {
      contents: contents.map(content => this.mapContentToDto(content)),
      total,
      page,
      totalPages,
      hasNext,
      hasPrevious,
    };
  }
}