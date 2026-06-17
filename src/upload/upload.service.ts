import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { ConfigService } from '@config/config.service';
import { Readable } from 'stream';

export type UploadFolder = 'products' | 'stores' | 'categories' | 'general';

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {
    const { cloudName, apiKey, apiSecret } = this.configService.storage;
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: UploadFolder = 'general',
  ): Promise<{ url: string; publicId: string }> {
    const { cloudName } = this.configService.storage;
    if (!cloudName) {
      throw new BadRequestException('Storage is not configured');
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `cadna-mart/${folder}`,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve(result);
        },
      );
      Readable.from(file.buffer).pipe(uploadStream);
    });

    return { url: result.secure_url, publicId: result.public_id };
  }

  async deleteFile(publicId: string): Promise<void> {
    const { cloudName } = this.configService.storage;
    if (!cloudName) return;
    await cloudinary.uploader.destroy(publicId);
  }
}
