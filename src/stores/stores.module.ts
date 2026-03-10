import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Store, StoreSchema } from './schemas/store.schema';
import { StoresRepository } from './stores.repository';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Store.name, schema: StoreSchema }])],
  controllers: [StoresController],
  providers: [StoresRepository, StoresService],
  exports: [StoresService, StoresRepository],
})
export class StoresModule {}
