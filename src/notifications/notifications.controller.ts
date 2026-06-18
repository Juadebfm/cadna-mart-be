import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesDto } from './dto/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('/')
  async list(
    @CurrentUser('id') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<object> {
    return this.notificationsService.findByUser(userId, Number(page), Number(limit));
  }

  @Patch('/:id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(@Param('id') id: string, @CurrentUser('id') userId: string): Promise<object> {
    return this.notificationsService.markRead(id, userId);
  }

  @Post('/preferences')
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: NotificationPreferencesDto,
  ): Promise<object> {
    return this.notificationsService.updatePreferences(userId, dto);
  }
}
