import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { ConfigService } from '@config/config.service';
import { Readable } from 'stream';
import { AccountType } from '@users/enums/account-type.enum';

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
    ownerId?: string,
  ): Promise<{ url: string; publicId: string }> {
    const { cloudName } = this.configService.storage;
    if (!cloudName) {
      throw new BadRequestException('Storage is not configured');
    }

    const scopedFolder = this.buildFolder(folder, ownerId);

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: scopedFolder,
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

  createPresignedUpload(folder: UploadFolder = 'general', ownerId: string) {
    const { cloudName, apiKey, apiSecret } = this.configService.storage;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException('Storage is not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const scopedFolder = this.buildFolder(folder, ownerId);
    const signature = cloudinary.utils.api_sign_request(
      { folder: scopedFolder, timestamp },
      apiSecret,
    );

    return {
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder: scopedFolder,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    };
  }

  async deleteFile(publicId: string): Promise<void> {
    const { cloudName } = this.configService.storage;
    if (!cloudName) return;
    await cloudinary.uploader.destroy(publicId);
  }

  async deleteOwnedFile(
    encodedPublicId: string,
    currentUser: { userId: string; accountType: string },
  ) {
    const publicId = this.decodePublicId(encodedPublicId);

    if (currentUser.accountType !== AccountType.ADMIN) {
      const ownershipMarker = `/user-${currentUser.userId}/`;
      if (!publicId.startsWith('cadna-mart/') || !publicId.includes(ownershipMarker)) {
        throw new ForbiddenException('You do not own this media asset');
      }
    }

    await this.deleteFile(publicId);
    return { publicId };
  }

  private buildFolder(folder: UploadFolder, ownerId?: string) {
    const baseFolder = `cadna-mart/${folder}`;
    return ownerId ? `${baseFolder}/user-${ownerId}` : baseFolder;
  }

  private decodePublicId(encodedPublicId: string) {
    try {
      const decoded = Buffer.from(encodedPublicId, 'base64url').toString('utf8').trim();
      if (!decoded) {
        throw new Error('Empty public id');
      }
      return decoded;
    } catch {
      throw new BadRequestException('Invalid media identifier');
    }
  }
}
