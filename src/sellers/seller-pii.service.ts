import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@config/config.service';

@Injectable()
export class SellerPiiService {
  constructor(private readonly config: ConfigService) {}

  encryptBankAccountNumber(value: string): string {
    const key = this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `v1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${ciphertext.toString('hex')}`;
  }

  decryptBankAccountNumber(value: string): string {
    if (!value.startsWith('v1:')) {
      throw new ServiceUnavailableException(
        'Stored payout account is not encrypted with the current format',
      );
    }
    const [, ivHex, tagHex, ciphertextHex] = value.split(':');
    if (!ivHex || !tagHex || !ciphertextHex) {
      throw new ServiceUnavailableException('Stored payout account ciphertext is invalid');
    }
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.getKey(), Buffer.from(ivHex, 'hex'));
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      return Buffer.concat([
        decipher.update(Buffer.from(ciphertextHex, 'hex')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new ServiceUnavailableException('Could not decrypt the stored payout account');
    }
  }

  private getKey(): Buffer {
    const configured = this.config.sellerPiiEncryptionKey;
    if (!/^[a-fA-F0-9]{64}$/.test(configured)) {
      throw new ServiceUnavailableException(
        'Configure SELLER_PII_ENCRYPTION_KEY as 64 hexadecimal characters before saving payout details',
      );
    }
    return Buffer.from(configured, 'hex');
  }
}
