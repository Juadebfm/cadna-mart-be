import { Injectable } from '@nestjs/common';
import { ConfigService } from '@config/config.service';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getWelcome() {
    return {
      name: this.configService.app.name,
      version: '1.0.0',
      environment: this.configService.app.nodeEnv,
      docs: `/${this.configService.app.apiPrefix}/docs`,
    };
  }
}
