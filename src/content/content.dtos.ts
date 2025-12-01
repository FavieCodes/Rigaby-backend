// src/content/content.dtos.ts
import { 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsNumber, 
  IsBoolean, 
  IsPositive,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContentType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContentDto {
  @ApiProperty({ description: 'Content title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Content description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ContentType, description: 'Content type' })
  @IsEnum(ContentType)
  type: ContentType;

  @ApiProperty({ description: 'Content category' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ description: 'Content source (author, publisher, etc.)' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes (for videos)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  duration?: number;

  @ApiPropertyOptional({ description: 'Number of pages (for books)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  pages?: number;

  @ApiPropertyOptional({ description: 'Content text (for articles/books)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Cloudinary file URL' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'Cloudinary thumbnail URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Cloudinary public ID' })
  @IsOptional()
  @IsString()
  publicId?: string;

  @ApiPropertyOptional({ description: 'Whether content is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UploadContentDto extends CreateContentDto {
  // Inherits all properties from CreateContentDto
  // Additional validation for file uploads can be added here
}

export class UpdateContentDto {
  @ApiPropertyOptional({ description: 'Content title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Content description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ContentType, description: 'Content type' })
  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType;

  @ApiPropertyOptional({ description: 'Content category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Content source' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  duration?: number;

  @ApiPropertyOptional({ description: 'Number of pages' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  pages?: number;

  @ApiPropertyOptional({ description: 'Content text' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Cloudinary file URL' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'Cloudinary thumbnail URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Cloudinary public ID' })
  @IsOptional()
  @IsString()
  publicId?: string;

  @ApiPropertyOptional({ description: 'Whether content is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class ContentResponseDto {
  @ApiProperty({ description: 'Content ID' })
  id: string;

  @ApiProperty({ description: 'Content title' })
  title: string;

  @ApiPropertyOptional({ description: 'Content description' })
  description?: string;

  @ApiProperty({ enum: ContentType, description: 'Content type' })
  type: ContentType;

  @ApiProperty({ description: 'Content category' })
  category: string;

  @ApiPropertyOptional({ description: 'Content source' })
  source?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  duration?: number;

  @ApiPropertyOptional({ description: 'Number of pages' })
  pages?: number;

  @ApiPropertyOptional({ description: 'Content text' })
  content?: string;

  @ApiProperty({ description: 'Whether content is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Total read count' })
  readCount: number;

  @ApiProperty({ description: 'Current active readers' })
  currentReaders: number;

  @ApiPropertyOptional({ description: 'Cloudinary file URL' })
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'Cloudinary thumbnail URL' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Cloudinary public ID' })
  publicId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: any;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  constructor(partial: Partial<ContentResponseDto>) {
    Object.assign(this, partial);
  }
}

export class ContentListResponseDto {
  @ApiProperty({ type: [ContentResponseDto], description: 'List of contents' })
  contents: ContentResponseDto[];

  @ApiProperty({ description: 'Total number of contents' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPrevious: boolean;
}

export class ContentCategoriesResponseDto {
  @ApiProperty({ type: [String], description: 'List of categories' })
  categories: string[];

  @ApiProperty({ description: 'Total number of categories' })
  totalCategories: number;
}

export class ContentStatsResponseDto {
  @ApiProperty({ description: 'Total content count' })
  totalContent: number;

  @ApiProperty({ description: 'Active content count' })
  activeContent: number;

  @ApiProperty({ description: 'Books count' })
  booksCount: number;

  @ApiProperty({ description: 'Videos count' })
  videosCount: number;

  @ApiProperty({ description: 'Articles count' })
  articlesCount: number;

  @ApiProperty({ description: 'Categories count' })
  categoriesCount: number;

  @ApiProperty({ description: 'Total pages across all books' })
  totalPages: number;

  @ApiProperty({ description: 'Total duration across all videos (minutes)' })
  totalDuration: number;

  @ApiProperty({ description: 'Total read count' })
  totalReads: number;

  @ApiProperty({ description: 'Average read time in seconds' })
  averageReadTime: number;
}

export class CloudinaryUploadResponseDto {
  @ApiProperty({ description: 'Public ID of the uploaded file' })
  public_id: string;

  @ApiProperty({ description: 'Secure URL for accessing the file' })
  secure_url: string;

  @ApiProperty({ description: 'File format' })
  format: string;

  @ApiProperty({ description: 'File size in bytes' })
  bytes: number;

  @ApiProperty({ description: 'Resource type' })
  resource_type: string;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at: string;

  @ApiProperty({ description: 'Tags associated with the file' })
  tags: string[];

  @ApiProperty({ description: 'Width in pixels (for images/videos)' })
  width?: number;

  @ApiProperty({ description: 'Height in pixels (for images/videos)' })
  height?: number;

  @ApiProperty({ description: 'Duration in seconds (for videos)' })
  duration?: number;

  @ApiProperty({ description: 'Number of pages (for documents)' })
  pages?: number;
}

export class StartReadingSessionResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ description: 'Reading session ID' })
  sessionId: string;
}

export class EndReadingSessionResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ description: 'Duration in seconds' })
  duration: number;
}

export class CurrentReadersResponseDto {
  @ApiProperty({ description: 'Number of current readers' })
  currentReaders: number;

  @ApiProperty({ 
    type: [Object], 
    description: 'List of active readers',
    example: [
      {
        userId: 'user123',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        startTime: '2023-01-01T00:00:00.000Z'
      }
    ]
  })
  readers: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    startTime: Date;
  }>;
}

export class ContentAnalyticsResponseDto {
  @ApiProperty({ description: 'Content ID' })
  contentId: string;

  @ApiProperty({ description: 'Total number of reads' })
  totalReads: number;

  @ApiProperty({ description: 'Current number of active readers' })
  currentReaders: number;

  @ApiProperty({ description: 'Total reading time in seconds' })
  totalReadingTime: number;

  @ApiProperty({ description: 'Average reading time in seconds' })
  averageReadingTime: number;

  @ApiProperty({ description: 'Total number of reading sessions' })
  readingSessions: number;

  @ApiProperty({ 
    description: 'Reading sessions grouped by day',
    example: { '2023-01-01': 5, '2023-01-02': 3 }
  })
  sessionsByDay: Record<string, number>;

  @ApiProperty({ 
    type: [Object],
    description: 'Recent reading sessions',
    example: [
      {
        id: 'session123',
        userId: 'user123',
        startTime: '2023-01-01T00:00:00.000Z',
        endTime: '2023-01-01T00:30:00.000Z',
        duration: 1800
      }
    ]
  })
  recentSessions: Array<{
    id: string;
    userId: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
  }>;
}

// Query DTOs for filtering and pagination
export class ContentQueryDto {
  @ApiPropertyOptional({ enum: ContentType, description: 'Filter by content type' })
  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}

export class CategoryContentQueryDto {
  @ApiPropertyOptional({ enum: ContentType, description: 'Filter by content type' })
  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}