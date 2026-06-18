import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet } from './schemas/wallet.schema';
import { WalletTransaction, WalletTransactionType } from './schemas/wallet-transaction.schema';

@Injectable()
export class WalletRepository {
  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<Wallet>,
    @InjectModel(WalletTransaction.name) private readonly txModel: Model<WalletTransaction>,
  ) {}

  async findOrCreateByUser(userId: string): Promise<Wallet> {
    const existing = (await this.walletModel
      .findOne({ userId: new Types.ObjectId(userId), deletedAt: null })
      .lean()
      .exec()) as Wallet | null;
    if (existing) return existing;
    return this.walletModel.create({ userId: new Types.ObjectId(userId) });
  }

  async findByUser(userId: string): Promise<Wallet | null> {
    return this.walletModel
      .findOne({ userId: new Types.ObjectId(userId), deletedAt: null })
      .lean()
      .exec() as Promise<Wallet | null>;
  }

  async credit(
    walletId: string,
    userId: string,
    amountKobo: number,
    description: string,
    reference?: string,
    orderId?: string,
  ): Promise<{ wallet: Wallet; tx: WalletTransaction }> {
    const wallet = (await this.walletModel
      .findByIdAndUpdate(walletId, { $inc: { balanceKobo: amountKobo } }, { new: true })
      .lean()
      .exec()) as Wallet;

    const tx = await this.txModel.create({
      walletId: new Types.ObjectId(walletId),
      userId: new Types.ObjectId(userId),
      type: WalletTransactionType.CREDIT,
      amountKobo,
      runningBalanceKobo: wallet.balanceKobo,
      reference: reference ?? null,
      orderId: orderId ?? null,
      description,
    });

    return { wallet, tx };
  }

  async debit(
    walletId: string,
    userId: string,
    amountKobo: number,
    description: string,
    reference?: string,
    orderId?: string,
  ): Promise<{ wallet: Wallet; tx: WalletTransaction }> {
    const wallet = (await this.walletModel
      .findByIdAndUpdate(walletId, { $inc: { balanceKobo: -amountKobo } }, { new: true })
      .lean()
      .exec()) as Wallet;

    const tx = await this.txModel.create({
      walletId: new Types.ObjectId(walletId),
      userId: new Types.ObjectId(userId),
      type: WalletTransactionType.DEBIT,
      amountKobo,
      runningBalanceKobo: wallet.balanceKobo,
      reference: reference ?? null,
      orderId: orderId ?? null,
      description,
    });

    return { wallet, tx };
  }

  async findTransactions(
    walletId: string,
    page: number,
    limit: number,
  ): Promise<{ items: WalletTransaction[]; totalItems: number }> {
    const filter = { walletId: new Types.ObjectId(walletId), deletedAt: null };
    const [items, totalItems] = await Promise.all([
      this.txModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec() as Promise<WalletTransaction[]>,
      this.txModel.countDocuments(filter).exec(),
    ]);
    return { items, totalItems };
  }
}
