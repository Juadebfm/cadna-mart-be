import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RewardsProgram,
  RewardsTier,
  RewardsCampaign,
  RewardsAccount,
  RewardsTransaction,
} from './schemas/rewards.schema';

@Injectable()
export class RewardsRepository {
  constructor(
    @InjectModel(RewardsProgram.name) private readonly programModel: Model<RewardsProgram>,
    @InjectModel(RewardsTier.name) private readonly tierModel: Model<RewardsTier>,
    @InjectModel(RewardsCampaign.name) private readonly campaignModel: Model<RewardsCampaign>,
    @InjectModel(RewardsAccount.name) private readonly accountModel: Model<RewardsAccount>,
    @InjectModel(RewardsTransaction.name) private readonly txModel: Model<RewardsTransaction>,
  ) {}

  // Program
  async getProgram(): Promise<RewardsProgram | null> {
    return this.programModel
      .findOne({ slug: 'default', deletedAt: null })
      .lean()
      .exec() as Promise<RewardsProgram | null>;
  }

  async upsertProgram(data: Partial<RewardsProgram>): Promise<RewardsProgram> {
    return this.programModel
      .findOneAndUpdate(
        { slug: 'default' },
        { ...data, slug: 'default' },
        { new: true, upsert: true },
      )
      .lean()
      .exec() as Promise<RewardsProgram>;
  }

  // Tiers
  async findTiers(): Promise<RewardsTier[]> {
    return this.tierModel.find({ deletedAt: null }).sort({ minPoints: 1 }).lean().exec() as Promise<
      RewardsTier[]
    >;
  }

  async createTier(data: Partial<RewardsTier>): Promise<RewardsTier> {
    return this.tierModel.create(data);
  }

  async updateTier(id: string, data: Partial<RewardsTier>): Promise<RewardsTier> {
    const doc = (await this.tierModel
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec()) as RewardsTier | null;
    if (!doc) throw new NotFoundException('Tier not found');
    return doc;
  }

  async deleteTier(id: string): Promise<void> {
    await this.tierModel.findByIdAndUpdate(id, { deletedAt: new Date() }).exec();
  }

  // Campaigns
  async findActiveCampaigns(): Promise<RewardsCampaign[]> {
    const now = new Date();
    return this.campaignModel
      .find({ isActive: true, startsAt: { $lte: now }, endsAt: { $gte: now }, deletedAt: null })
      .lean()
      .exec() as Promise<RewardsCampaign[]>;
  }

  async findAllCampaigns(): Promise<RewardsCampaign[]> {
    return this.campaignModel
      .find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .lean()
      .exec() as Promise<RewardsCampaign[]>;
  }

  async createCampaign(data: Partial<RewardsCampaign>): Promise<RewardsCampaign> {
    return this.campaignModel.create(data);
  }

  async updateCampaign(id: string, data: Partial<RewardsCampaign>): Promise<RewardsCampaign> {
    const doc = (await this.campaignModel
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec()) as RewardsCampaign | null;
    if (!doc) throw new NotFoundException('Campaign not found');
    return doc;
  }

  async deleteCampaign(id: string): Promise<void> {
    await this.campaignModel.findByIdAndUpdate(id, { deletedAt: new Date() }).exec();
  }

  // Accounts
  async findOrCreateAccount(userId: string): Promise<RewardsAccount> {
    const existing = (await this.accountModel
      .findOne({ userId: new Types.ObjectId(userId), deletedAt: null })
      .lean()
      .exec()) as RewardsAccount | null;
    if (existing) return existing;
    return this.accountModel.create({ userId: new Types.ObjectId(userId) });
  }

  async updateAccount(userId: string, update: Partial<RewardsAccount>): Promise<RewardsAccount> {
    return this.accountModel
      .findOneAndUpdate({ userId: new Types.ObjectId(userId), deletedAt: null }, update, {
        new: true,
        upsert: true,
      })
      .lean()
      .exec() as Promise<RewardsAccount>;
  }

  // Transactions
  async findTransactions(
    accountId: string,
    page: number,
    limit: number,
  ): Promise<{ items: RewardsTransaction[]; totalItems: number }> {
    const filter = { accountId: new Types.ObjectId(accountId), deletedAt: null };
    const [items, totalItems] = await Promise.all([
      this.txModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as Promise<RewardsTransaction[]>,
      this.txModel.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }

  async createTransaction(data: Partial<RewardsTransaction>): Promise<RewardsTransaction> {
    return this.txModel.create(data);
  }
}
