import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { DealCampaign } from './schemas/deal-campaign.schema';
import { DealCampaignQueryDto } from './dto/deal-campaign-query.dto';

@Injectable()
export class DealsRepository {
  constructor(
    @InjectModel(DealCampaign.name) public readonly dealCampaignModel: Model<DealCampaign>,
  ) {}

  async create(data: Partial<DealCampaign>): Promise<DealCampaign> {
    const campaign = new this.dealCampaignModel(data);
    return campaign.save() as unknown as DealCampaign;
  }

  async findById(id: string): Promise<DealCampaign | null> {
    return this.dealCampaignModel
      .findOne({ _id: id, deletedAt: null })
      .populate('seller', 'name slug owner')
      .lean()
      .exec() as unknown as Promise<DealCampaign | null>;
  }

  async findByIdForSeller(id: string, sellerId: string): Promise<DealCampaign | null> {
    return this.dealCampaignModel
      .findOne({ _id: id, seller: sellerId, deletedAt: null })
      .populate('seller', 'name slug owner')
      .lean()
      .exec() as unknown as Promise<DealCampaign | null>;
  }

  async findByPaymentReference(reference: string): Promise<DealCampaign | null> {
    return this.dealCampaignModel
      .findOne({ paymentReference: reference, deletedAt: null })
      .populate('seller', 'name slug owner')
      .lean()
      .exec() as unknown as Promise<DealCampaign | null>;
  }

  async findBySellerWithPagination(
    sellerId: string,
    query: DealCampaignQueryDto,
  ): Promise<{ items: DealCampaign[]; totalItems: number }> {
    const filter: FilterQuery<DealCampaign> = { seller: sellerId, deletedAt: null };
    if (query.status) filter.status = query.status;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
    const skip = (query.page - 1) * query.limit;

    const [items, totalItems] = await Promise.all([
      this.dealCampaignModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate('seller', 'name slug owner')
        .lean()
        .exec(),
      this.dealCampaignModel.countDocuments(filter).exec(),
    ]);

    return { items: items as unknown as DealCampaign[], totalItems };
  }

  async findAllWithPagination(
    query: DealCampaignQueryDto,
  ): Promise<{ items: DealCampaign[]; totalItems: number }> {
    const filter: FilterQuery<DealCampaign> = { deletedAt: null };
    if (query.status) filter.status = query.status;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
    if (query.sellerId) filter.seller = query.sellerId;
    const skip = (query.page - 1) * query.limit;

    const [items, totalItems] = await Promise.all([
      this.dealCampaignModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate('seller', 'name slug owner')
        .lean()
        .exec(),
      this.dealCampaignModel.countDocuments(filter).exec(),
    ]);

    return { items: items as unknown as DealCampaign[], totalItems };
  }

  async update(id: string, data: Partial<DealCampaign>): Promise<DealCampaign | null> {
    return this.dealCampaignModel
      .findByIdAndUpdate(id, data, { new: true })
      .populate('seller', 'name slug owner')
      .lean()
      .exec() as unknown as Promise<DealCampaign | null>;
  }
}
