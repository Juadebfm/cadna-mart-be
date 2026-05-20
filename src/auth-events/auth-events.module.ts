import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthEvent, AuthEventSchema } from './schemas/auth-event.schema';
import { AuthEventsService } from './auth-events.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: AuthEvent.name, schema: AuthEventSchema }])],
  providers: [AuthEventsService],
  exports: [AuthEventsService],
})
export class AuthEventsModule {}
