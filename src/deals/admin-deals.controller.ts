import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { ParseObjectIdPipe } from '@common/pipes/parse-object-id.pipe';
import { DealsService } from './deals.service';
import { DealCampaignQueryDto } from './dto/deal-campaign-query.dto';
import { AdminUpdateDealCampaignDto } from './dto/admin-update-deal-campaign.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@AccountTypes(AccountType.ADMIN)
@Controller('admin/deals/campaigns')
export class AdminDealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  @ApiOperation({ summary: 'List all deal campaigns' })
  async list(@Query() query: DealCampaignQueryDto) {
    return this.dealsService.listAllCampaigns(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one deal campaign' })
  async get(@Param('id', ParseObjectIdPipe) id: string) {
    return this.dealsService.getCampaignById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a deal campaign' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AdminUpdateDealCampaignDto,
  ) {
    return this.dealsService.updateCampaignByAdmin(id, dto);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a deal campaign' })
  async approve(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() actor: { userId: string; accountType: string },
  ) {
    return this.dealsService.approveCampaign(id, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a deal campaign' })
  async remove(@Param('id', ParseObjectIdPipe) id: string) {
    await this.dealsService.removeCampaignByAdmin(id);
  }
}
