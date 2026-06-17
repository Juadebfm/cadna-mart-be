import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Address } from './schemas/address.schema';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(@InjectModel(Address.name) private readonly addressModel: Model<Address>) {}

  async list(userId: string): Promise<Address[]> {
    return this.addressModel
      .find({ userId: new Types.ObjectId(userId), deletedAt: null })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean()
      .exec() as unknown as Address[];
  }

  async create(userId: string, dto: CreateAddressDto): Promise<Address> {
    const existing = await this.addressModel.countDocuments({
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    });

    const shouldBeDefault = existing === 0 ? true : !!dto.isDefault;

    if (shouldBeDefault) {
      await this.clearDefault(userId);
    }

    const address = await this.addressModel.create({
      ...dto,
      userId: new Types.ObjectId(userId),
      isDefault: shouldBeDefault,
    });
    return address.toObject() as Address;
  }

  async update(userId: string, addressId: string, dto: UpdateAddressDto): Promise<Address> {
    const address = await this.findOwnedAddress(userId, addressId);

    if (dto.isDefault === true) {
      await this.clearDefault(userId);
    }

    const updated = await this.addressModel
      .findByIdAndUpdate(address._id, dto, { new: true })
      .lean()
      .exec();
    if (!updated) {
      throw new NotFoundException('Address not found');
    }
    return updated as unknown as Address;
  }

  async remove(userId: string, addressId: string): Promise<void> {
    const address = await this.findOwnedAddress(userId, addressId);
    await this.addressModel
      .updateOne({ _id: address._id }, { deletedAt: new Date(), isDefault: false })
      .exec();
  }

  async setDefault(userId: string, addressId: string): Promise<Address> {
    const address = await this.findOwnedAddress(userId, addressId);
    await this.clearDefault(userId);
    const updated = await this.addressModel
      .findByIdAndUpdate(address._id, { isDefault: true }, { new: true })
      .lean()
      .exec();
    if (!updated) {
      throw new NotFoundException('Address not found');
    }
    return updated as unknown as Address;
  }

  private async clearDefault(userId: string): Promise<void> {
    await this.addressModel
      .updateMany(
        { userId: new Types.ObjectId(userId), isDefault: true, deletedAt: null },
        { isDefault: false },
      )
      .exec();
  }

  private async findOwnedAddress(userId: string, addressId: string): Promise<Address> {
    const address = await this.addressModel
      .findOne({ _id: addressId, deletedAt: null })
      .lean()
      .exec();
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    if ((address as unknown as Address).userId.toString() !== userId) {
      throw new ForbiddenException('You do not own this address');
    }
    return address as unknown as Address;
  }
}
