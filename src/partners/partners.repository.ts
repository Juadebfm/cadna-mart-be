import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PartnerProfile,
  PartnerCommitment,
  PartnerDispute,
  PartnerStatus,
} from './schemas/partner-profile.schema';

@Injectable()
export class PartnersRepository {
  constructor(
    @InjectModel(PartnerProfile.name) private readonly profileModel: Model<PartnerProfile>,
    @InjectModel(PartnerCommitment.name) private readonly commitmentModel: Model<PartnerCommitment>,
    @InjectModel(PartnerDispute.name) private readonly disputeModel: Model<PartnerDispute>,
  ) {}

  async findOrCreateProfile(userId: string): Promise<PartnerProfile> {
    const existing = (await this.profileModel
      .findOne({ userId: new Types.ObjectId(userId), deletedAt: null })
      .lean()
      .exec()) as PartnerProfile | null;
    if (existing) return existing;
    return this.profileModel.create({ userId: new Types.ObjectId(userId) });
  }

  async findProfileByUser(userId: string): Promise<PartnerProfile | null> {
    return this.profileModel
      .findOne({ userId: new Types.ObjectId(userId), deletedAt: null })
      .lean()
      .exec() as Promise<PartnerProfile | null>;
  }

  async updateProfile(userId: string, update: Partial<PartnerProfile>): Promise<PartnerProfile> {
    const doc = (await this.profileModel
      .findOneAndUpdate({ userId: new Types.ObjectId(userId), deletedAt: null }, update, {
        new: true,
        upsert: true,
      })
      .lean()
      .exec()) as PartnerProfile;
    return doc;
  }

  async findAllProfiles(
    page: number,
    limit: number,
  ): Promise<{ items: PartnerProfile[]; totalItems: number }> {
    const filter = { deletedAt: null };
    const [items, totalItems] = await Promise.all([
      this.profileModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as Promise<PartnerProfile[]>,
      this.profileModel.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }

  async approveProfile(id: string, adminId: string): Promise<PartnerProfile> {
    const doc = (await this.profileModel
      .findByIdAndUpdate(
        id,
        {
          status: PartnerStatus.APPROVED,
          approvedBy: new Types.ObjectId(adminId),
          approvedAt: new Date(),
        },
        { new: true },
      )
      .lean()
      .exec()) as PartnerProfile | null;
    if (!doc) throw new NotFoundException('Partner not found');
    return doc;
  }

  async createCommitment(
    partnerId: string,
    productId: string,
    amountNGN: number,
  ): Promise<PartnerCommitment> {
    return this.commitmentModel.create({
      partnerId: new Types.ObjectId(partnerId),
      productId: new Types.ObjectId(productId),
      amountNGN,
    });
  }

  async findCommitmentsByPartner(
    partnerId: string,
    page: number,
    limit: number,
  ): Promise<{ items: PartnerCommitment[]; totalItems: number }> {
    const filter = { partnerId: new Types.ObjectId(partnerId), deletedAt: null };
    const [items, totalItems] = await Promise.all([
      this.commitmentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as Promise<PartnerCommitment[]>,
      this.commitmentModel.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }

  async findCommitmentById(id: string): Promise<PartnerCommitment | null> {
    return this.commitmentModel.findById(id).lean().exec() as Promise<PartnerCommitment | null>;
  }

  async approveCommitment(id: string, adminId: string): Promise<PartnerCommitment> {
    const doc = (await this.commitmentModel
      .findByIdAndUpdate(
        id,
        { status: 'approved', approvedBy: new Types.ObjectId(adminId), approvedAt: new Date() },
        { new: true },
      )
      .lean()
      .exec()) as PartnerCommitment | null;
    if (!doc) throw new NotFoundException('Commitment not found');
    return doc;
  }

  async findAllCommitments(
    page: number,
    limit: number,
  ): Promise<{ items: PartnerCommitment[]; totalItems: number }> {
    const filter = { deletedAt: null };
    const [items, totalItems] = await Promise.all([
      this.commitmentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as Promise<PartnerCommitment[]>,
      this.commitmentModel.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }

  async createDispute(
    partnerId: string,
    commitmentId: string,
    reason: string,
  ): Promise<PartnerDispute> {
    return this.disputeModel.create({
      partnerId: new Types.ObjectId(partnerId),
      commitmentId: new Types.ObjectId(commitmentId),
      reason,
    });
  }

  async resolveDispute(id: string, adminId: string, resolution: string): Promise<PartnerDispute> {
    const doc = (await this.disputeModel
      .findByIdAndUpdate(
        id,
        { status: 'resolved', resolvedBy: new Types.ObjectId(adminId), resolution },
        { new: true },
      )
      .lean()
      .exec()) as PartnerDispute | null;
    if (!doc) throw new NotFoundException('Dispute not found');
    return doc;
  }
}
