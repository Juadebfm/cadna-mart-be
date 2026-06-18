import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { WalletTransaction, WalletTransactionSchema } from './schemas/wallet-transaction.schema';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WalletRepository } from './wallet.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService, WalletRepository],
  exports: [WalletService],
})
export class WalletModule {}
