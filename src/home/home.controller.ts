import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@auth/decorators/public.decorator';
import { HomeService } from './home.service';

@ApiTags('Home')
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get composite homepage payload' })
  async getHomepage(@Query('limitPerSection') limitPerSection: number = 8) {
    return this.homeService.getHomepage(Math.min(+limitPerSection || 8, 20));
  }
}
