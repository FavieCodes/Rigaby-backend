import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryUploadResponseDto } from '../content/content.dtos';

@Injectable()
export class CloudinaryService {
  async uploadFile(file: Express.Multer.File, folder: string = 'rigaby'): Promise<CloudinaryUploadResponseDto> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `${folder}/${this.getResourceType(file.mimetype)}`,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(new BadRequestException(`Upload failed: ${error.message}`));
          } else {
            resolve(result as CloudinaryUploadResponseDto);
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async uploadVideo(file: Express.Multer.File, folder: string = 'rigaby/videos'): Promise<CloudinaryUploadResponseDto> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'video',
          chunk_size: 6000000, // 6MB chunks for large videos
        },
        (error, result) => {
          if (error) {
            reject(new BadRequestException(`Video upload failed: ${error.message}`));
          } else {
            resolve(result as CloudinaryUploadResponseDto);
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async uploadDocument(file: Express.Multer.File, folder: string = 'rigaby/documents'): Promise<CloudinaryUploadResponseDto> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'raw', // For PDFs and other documents
        },
        (error, result) => {
          if (error) {
            reject(new BadRequestException(`Document upload failed: ${error.message}`));
          } else {
            resolve(result as CloudinaryUploadResponseDto);
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async deleteFile(publicId: string, resourceType: string = 'image'): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
    } catch (error) {
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  async generateThumbnail(videoUrl: string, timestamp: number = 10): Promise<string> {
    const publicId = this.extractPublicId(videoUrl);
    return cloudinary.url(publicId, {
      resource_type: 'video',
      transformation: [
        { width: 300, height: 200, crop: 'fill' },
        { start_offset: timestamp },
      ],
    });
  }

  private getResourceType(mimetype: string): string {
    if (mimetype.startsWith('video/')) return 'videos';
    if (mimetype.startsWith('image/')) return 'images';
    if (mimetype.includes('pdf') || mimetype.includes('document')) return 'documents';
    return 'files';
  }

  private extractPublicId(url: string): string {
    const matches = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
    return matches ? matches[1] : '';
  }
}