import { Injectable, BadRequestException } from '@nestjs/common';
import { RegistrationSessionRepository } from './registration-session.repository';
import { RegistrationSession } from './schemas/registration-session.schema';
import { ERROR_MESSAGES } from '@common/constants/error-messages.constants';

const SESSION_TTL_MINUTES = 30;

@Injectable()
export class RegistrationSessionService {
  constructor(private readonly repository: RegistrationSessionRepository) {}

  async createSession(email: string): Promise<RegistrationSession> {
    return this.repository.create({
      email: email.toLowerCase(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000),
    });
  }

  async getSession(sessionId: string): Promise<RegistrationSession> {
    const session = await this.repository.findBySessionId(sessionId);
    if (!session) {
      throw new BadRequestException(ERROR_MESSAGES.REGISTRATION_SESSION_NOT_FOUND);
    }
    return session;
  }

  async validateStep(sessionId: string, expectedStep: number): Promise<RegistrationSession> {
    const session = await this.getSession(sessionId);
    if (session.currentStep !== expectedStep) {
      throw new BadRequestException(ERROR_MESSAGES.REGISTRATION_SESSION_INVALID_STEP);
    }
    return session;
  }

  async setDetails(
    sessionId: string,
    details: {
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      phoneNumber?: string;
      termsAccepted: boolean;
    },
  ): Promise<RegistrationSession> {
    const session = await this.validateStep(sessionId, 1);
    return this.repository.update(session.sessionId, {
      firstName: details.firstName,
      lastName: details.lastName,
      dateOfBirth: details.dateOfBirth ? new Date(details.dateOfBirth) : null,
      phoneNumber: details.phoneNumber || null,
      termsAccepted: details.termsAccepted,
      currentStep: 2,
    }) as Promise<RegistrationSession>;
  }

  async completeAndDelete(sessionId: string): Promise<void> {
    await this.repository.delete(sessionId);
  }
}
