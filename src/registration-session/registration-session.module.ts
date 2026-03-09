import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RegistrationSession, RegistrationSessionSchema } from './schemas/registration-session.schema';
import { RegistrationSessionRepository } from './registration-session.repository';
import { RegistrationSessionService } from './registration-session.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RegistrationSession.name, schema: RegistrationSessionSchema },
    ]),
  ],
  providers: [RegistrationSessionRepository, RegistrationSessionService],
  exports: [RegistrationSessionService],
})
export class RegistrationSessionModule {}
