import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { UsersService } from '@users/users.service';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  serializeUser(user: { userId: string }, done: (err: Error | null, id?: string) => void): void {
    done(null, user.userId);
  }

  async deserializeUser(
    userId: string,
    done: (err: Error | null, user?: unknown) => void,
  ): Promise<void> {
    try {
      const user = await this.usersService.findById(userId);
      done(null, user);
    } catch (err) {
      done(err as Error);
    }
  }
}
