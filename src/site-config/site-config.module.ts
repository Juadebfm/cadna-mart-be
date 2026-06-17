import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteConfig, SiteConfigSchema } from './schemas/site-config.schema';
import { SiteConfigController } from './site-config.controller';
import { SiteConfigService } from './site-config.service';
import { PublicConfigController } from './public-config.controller';
import { LegalPagesController } from './legal-pages.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: SiteConfig.name, schema: SiteConfigSchema }])],
  controllers: [SiteConfigController, PublicConfigController, LegalPagesController],
  providers: [SiteConfigService],
  exports: [SiteConfigService],
})
export class SiteConfigModule {}
