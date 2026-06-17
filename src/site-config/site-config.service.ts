import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SiteConfig } from './schemas/site-config.schema';

@Injectable()
export class SiteConfigService {
  constructor(@InjectModel(SiteConfig.name) private readonly siteConfigModel: Model<SiteConfig>) {}

  async getConfig() {
    const configs = await this.siteConfigModel.find().lean().exec();
    const result: Record<string, any> = {};

    for (const config of configs) {
      result[config.key] = config.value;
    }

    if (Object.keys(result).length === 0) {
      return this.getDefaults();
    }

    return this.normalizeConfig(result);
  }

  private getDefaults() {
    return {
      footer: {
        aboutText:
          'Cadna Mart is your trusted online marketplace for quality products and fast delivery.',
        links: [
          { label: 'About Us', url: '/about' },
          { label: 'Contact Us', url: '/contact' },
          { label: 'Returns', url: '/policies/returns' },
          { label: 'Privacy Policy', url: '/privacy' },
        ],
      },
      socialLinks: [],
      contact: {
        email: 'support@cadnamart.com',
        phone: '+234 800 000 0000',
      },
    };
  }

  private normalizeConfig(raw: Record<string, any>) {
    const defaults = this.getDefaults();

    const footerFromRaw = raw.footer ?? {};
    const linksFromRaw = Array.isArray(footerFromRaw.links)
      ? footerFromRaw.links
      : [
          ...(Array.isArray(footerFromRaw.companyLinks) ? footerFromRaw.companyLinks : []),
          ...(Array.isArray(footerFromRaw.supportLinks) ? footerFromRaw.supportLinks : []),
        ];

    const socialLinks = Array.isArray(raw.socialLinks)
      ? raw.socialLinks
      : this.socialObjectToArray(raw.social ?? {});

    return {
      footer: {
        aboutText: footerFromRaw.aboutText ?? defaults.footer.aboutText,
        links: linksFromRaw.length > 0 ? linksFromRaw : defaults.footer.links,
      },
      socialLinks,
      contact: {
        email: raw.contact?.email ?? defaults.contact.email,
        phone: raw.contact?.phone ?? defaults.contact.phone,
      },
    };
  }

  private socialObjectToArray(social: Record<string, unknown>) {
    return Object.entries(social)
      .filter(([, url]) => typeof url === 'string' && url.trim().length > 0)
      .map(([platform, url]) => ({ platform, url: String(url) }));
  }
}
