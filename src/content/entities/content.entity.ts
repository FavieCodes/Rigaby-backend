// src/content/entities/content.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import { ContentType } from '@prisma/client';

export class ContentEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ enum: ContentType })
  type: ContentType;

  @ApiProperty()
  category: string;

  @ApiProperty({ required: false })
  source?: string;

  @ApiProperty({ required: false })
  duration?: number;

  @ApiProperty({ required: false })
  pages?: number;

  @ApiProperty({ required: false })
  content?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  metadata?: any;

  // New fields for reading analytics
  @ApiProperty()
  readCount: number;

  @ApiProperty()
  currentReaders: number;

  // New Cloudinary fields
  @ApiProperty({ required: false })
  fileUrl?: string;

  @ApiProperty({ required: false })
  thumbnailUrl?: string;

  @ApiProperty({ required: false })
  publicId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<ContentEntity>) {
    Object.assign(this, partial);
  }
}