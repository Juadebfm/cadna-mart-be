import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@auth/decorators/public.decorator';
import { StoresService } from './stores.service';

@ApiTags('Stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Public()
  @Get(':storeId/summary')
  @ApiOperation({ summary: 'Get store summary card' })
  async getSummary(@Param('storeId') storeId: string) {
    return this.storesService.getSummary(storeId);
  }
}
