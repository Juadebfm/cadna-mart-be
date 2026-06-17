import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PricingRule } from './schemas/pricing-rule.schema';
import { SiteConfig } from '@site-config/schemas/site-config.schema';
import {
  CreatePricingRuleDto,
  UpdatePricingRuleDto,
  UpdateFeesDto,
  SimulateDto,
} from './dto/pricing-rule.dto';

interface FeeConfig {
  vatPercent: number;
  standardDeliveryFee: number;
  expressDeliveryFee: number;
  platformFeePercent: number;
}

@Injectable()
export class AdminPricingService {
  private readonly DEFAULT_VAT = 7.5;
  private readonly DEFAULT_STANDARD_DELIVERY = 1500;
  private readonly DEFAULT_EXPRESS_DELIVERY = 3000;
  private readonly DEFAULT_PLATFORM_FEE = 0;

  constructor(
    @InjectModel(PricingRule.name) private readonly pricingRuleModel: Model<PricingRule>,
    @InjectModel(SiteConfig.name) private readonly siteConfigModel: Model<SiteConfig>,
  ) {}

  private async getFeeConfig(): Promise<FeeConfig> {
    const doc = await this.siteConfigModel.findOne({ key: 'fees' }).lean().exec();
    const stored = (doc?.value ?? {}) as Partial<FeeConfig>;

    return {
      vatPercent: stored.vatPercent ?? this.DEFAULT_VAT,
      standardDeliveryFee: stored.standardDeliveryFee ?? this.DEFAULT_STANDARD_DELIVERY,
      expressDeliveryFee: stored.expressDeliveryFee ?? this.DEFAULT_EXPRESS_DELIVERY,
      platformFeePercent: stored.platformFeePercent ?? this.DEFAULT_PLATFORM_FEE,
    };
  }

  async listRules(): Promise<PricingRule[]> {
    return this.pricingRuleModel.find({ deletedAt: null }).sort({ createdAt: -1 }).exec();
  }

  async createRule(dto: CreatePricingRuleDto): Promise<PricingRule> {
    const rule = new this.pricingRuleModel({
      name: dto.name,
      type: dto.type,
      scope: dto.scope,
      scopeValue: dto.scopeValue ?? null,
      value: dto.value,
      valueType: dto.valueType,
      description: dto.description ?? null,
    });
    return rule.save();
  }

  async updateRule(id: string, dto: UpdatePricingRuleDto): Promise<PricingRule> {
    const rule = await this.pricingRuleModel
      .findOneAndUpdate({ _id: id, deletedAt: null }, { $set: dto }, { new: true })
      .exec();

    if (!rule) {
      throw new NotFoundException(`Pricing rule ${id} not found`);
    }

    return rule;
  }

  async getFees(): Promise<object> {
    const config = await this.getFeeConfig();
    return {
      ...config,
      vatRate: config.vatPercent / 100,
      currency: 'NGN',
    };
  }

  async updateFees(dto: UpdateFeesDto): Promise<object> {
    const existing = await this.siteConfigModel.findOne({ key: 'fees' }).lean().exec();
    const current = (existing?.value ?? {}) as Record<string, unknown>;

    const merged: Record<string, unknown> = { ...current };
    if (dto.vatPercent !== undefined) merged.vatPercent = dto.vatPercent;
    if (dto.standardDeliveryFee !== undefined) merged.standardDeliveryFee = dto.standardDeliveryFee;
    if (dto.expressDeliveryFee !== undefined) merged.expressDeliveryFee = dto.expressDeliveryFee;
    if (dto.platformFeePercent !== undefined) merged.platformFeePercent = dto.platformFeePercent;

    await this.siteConfigModel
      .findOneAndUpdate({ key: 'fees' }, { $set: { value: merged } }, { upsert: true, new: true })
      .exec();

    return this.getFees();
  }

  async simulate(dto: SimulateDto): Promise<object> {
    const config = await this.getFeeConfig();
    const subtotal = dto.cartSubtotal;
    const deliveryMode = dto.deliveryMode ?? 'standard';

    const deliveryFee =
      deliveryMode === 'express'
        ? config.expressDeliveryFee
        : deliveryMode === 'pickup'
          ? 0
          : config.standardDeliveryFee;

    const tax = subtotal * (config.vatPercent / 100);
    const platformFee = subtotal * (config.platformFeePercent / 100);
    const total = subtotal + deliveryFee + tax + platformFee;

    const fmt = (n: number) => ({
      amount: Math.round(n),
      currency: 'NGN',
      formatted: '₦' + Math.round(n).toLocaleString('en-NG'),
    });

    return {
      subtotal: fmt(subtotal),
      deliveryFee: fmt(deliveryFee),
      tax: fmt(tax),
      platformFee: fmt(platformFee),
      total: fmt(total),
      deliveryMode,
      config: {
        vatPercent: config.vatPercent,
        platformFeePercent: config.platformFeePercent,
      },
    };
  }
}
