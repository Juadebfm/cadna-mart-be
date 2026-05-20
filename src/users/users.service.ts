import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { FilterQuery } from 'mongoose';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './schemas/user.schema';
import { hashPassword } from '@common/utils/hash.util';
import { ERROR_MESSAGES } from '@common/constants/error-messages.constants';
import { PaginatedResult } from '@common/interfaces/api-response.interface';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findByEmail(createUserDto.email);
    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.USER_ALREADY_EXISTS);
    }

    const hashedPassword = await hashPassword(createUserDto.password);
    const { dateOfBirth, termsAccepted, ...rest } = createUserDto;
    return this.usersRepository.create({
      ...rest,
      password: hashedPassword,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      termsAcceptedAt: termsAccepted ? new Date() : null,
    });
  }

  async findAll(query: UserQueryDto): Promise<PaginatedResult<User>> {
    const filter: FilterQuery<User> = {};

    if (query.search) {
      filter.$or = [
        { firstName: { $regex: query.search, $options: 'i' } },
        { lastName: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }

    if (query.accountType) {
      filter.accountType = query.accountType;
    }

    return this.usersRepository.findAll(filter, query);
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findByEmailWithPassword(email);
  }

  async findByClerkId(clerkId: string): Promise<User | null> {
    return this.usersRepository.findByClerkId(clerkId);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.update(id, updateUserDto);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }

  async remove(id: string): Promise<User> {
    const user = await this.usersRepository.softDelete(id);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    await this.usersRepository.updateRefreshToken(userId, refreshToken);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepository.updateLastLogin(userId);
  }

  async verifyUser(userId: string): Promise<void> {
    await this.usersRepository.verifyUser(userId);
  }

  async setTwoFactor(userId: string, enabled: boolean): Promise<void> {
    await this.usersRepository.setTwoFactor(userId, enabled);
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.usersRepository.updatePassword(userId, hashedPassword);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const updates: Partial<User> = {};
    if (dto.firstName !== undefined) updates.firstName = dto.firstName;
    if (dto.lastName !== undefined) updates.lastName = dto.lastName;
    if (dto.phoneNumber !== undefined) updates.phoneNumber = dto.phoneNumber;
    if (dto.dateOfBirth !== undefined) {
      updates.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    }
    const user = await this.usersRepository.update(userId, updates as any);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }

  async setMarketingConsent(userId: string, optIn: boolean): Promise<User> {
    const user = await this.usersRepository.setMarketingConsent(userId, optIn);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }

  toPublicUser(user: User) {
    return {
      id: (user as unknown as { id?: string }).id ?? user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      accountType: user.accountType,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth,
      isEmailVerified: user.isVerified,
      isVerified: user.isVerified, // Backward compatibility for existing clients
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      marketingConsent: !!user.marketingConsentAt,
      marketingConsentAt: user.marketingConsentAt,
      createdAt: user.createdAt,
      fullName: (user as unknown as { fullName?: string }).fullName,
    };
  }
}
