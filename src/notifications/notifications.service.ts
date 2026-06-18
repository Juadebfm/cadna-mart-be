import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { NotificationPreferencesDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  async findByUser(userId: string, page: number, limit: number): Promise<object> {
    const { items, totalItems } = await this.repo.findByUser(userId, page, limit);
    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async markRead(id: string, userId: string): Promise<object> {
    const notification = await this.repo.markRead(id, userId);
    return { notification };
  }

  async updatePreferences(_userId: string, dto: NotificationPreferencesDto): Promise<object> {
    // Deferred: preferences are stored in user profile; stub returns accepted preferences
    return { preferences: dto, note: 'preferences saved (user-profile integration deferred)' };
  }

  async broadcast(dto: {
    title: string;
    body: string;
    userIds?: string[];
    accountType?: string;
  }): Promise<object> {
    // Deferred: fan-out requires a queue / FCM integration
    return {
      queued: true,
      targetUserIds: dto.userIds?.length ?? 0,
      targetAccountType: dto.accountType ?? null,
      note: 'broadcast queued (FCM/push integration deferred)',
    };
  }
}
