import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SiteConfig } from './schemas/site-config.schema';

@Injectable()
export class SiteConfigService {
  constructor(
    @InjectModel(SiteConfig.name) private readonly siteConfigModel: Model<SiteConfig>,
  ) {}

  async getConfig() {
    const configs = await this.siteConfigModel.find().lean().exec();
    const result: Record<string, unknown> = {};

    for (const config of configs) {
      result[config.key] = config.value;
    }

    if (Object.keys(result).length === 0) {
      return this.getDefaults();
    }

    return result;
  }

  private getDefaults() {
    return {
      footer: {
        companyLinks: [
          { label: 'About Us', url: '/about' },
          { label: 'Careers', url: '/careers' },
          { label: 'Terms & Conditions', url: '/terms' },
          { label: 'Privacy Policy', url: '/privacy' },
        ],
        supportLinks: [
          { label: 'Help Center', url: '/help' },
          { label: 'Contact Us', url: '/contact' },
          { label: 'Returns', url: '/policies/returns' },
        ],
      },
      contact: {
        email: 'support@cadnamart.com',
        phone: '+234 800 000 0000',
      },
      social: {
        facebook: null,
        twitter: null,
        instagram: null,
        linkedin: null,
      },
    };
  }
}
