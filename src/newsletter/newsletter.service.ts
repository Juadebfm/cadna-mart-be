import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NewsletterSubscription } from './schemas/newsletter-subscription.schema';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectModel(NewsletterSubscription.name)
    private readonly subscriptionModel: Model<NewsletterSubscription>,
  ) {}

  async subscribe(email: string) {
    const existing = await this.subscriptionModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
      }
      return { message: 'Subscription successful' };
    }

    await this.subscriptionModel.create({ email: email.toLowerCase() });
    return { message: 'Subscription successful' };
  }
}
