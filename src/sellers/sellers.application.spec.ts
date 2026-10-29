import { ForbiddenException, ConflictException } from '@nestjs/common';
jest.mock('@products/products.service', () => ({ ProductsService: class ProductsService {} }));
import { SellersService } from './sellers.service';
import {
  SellerApplicantType,
  SellerApplicationStatus,
  BusinessType,
} from './schemas/seller-profile.schema';

describe('SellersService application drafts', () => {
  const profile = {
    id: 'profile-id',
    userId: 'user-id',
    applicationStatus: SellerApplicationStatus.DRAFT,
    applicantType: SellerApplicantType.INDIVIDUAL,
    businessName: 'Sample Shop',
    businessRegistrationNumber: null,
    businessAddress: 'Lagos',
    businessType: BusinessType.INDIVIDUAL,
  };
  const prisma = {
    sellerProfile: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    sellerApplicationReview: { create: jest.fn() },
    sellerApplicationDocument: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    seller: { findFirst: jest.fn(), update: jest.fn() },
  };
  const usersService = { findById: jest.fn() };
  const bankingService = {
    resolveAccount: jest.fn(),
    listBanks: jest.fn(),
    providerName: 'paystack',
  };
  const uploadService = {
    uploadPrivateSellerDocument: jest.fn(),
    deletePrivateSellerDocument: jest.fn(),
    createPrivateSellerDocumentDownloadUrl: jest.fn(),
  };
  const productsService = {
    createMyProduct: jest.fn(),
    findMyProducts: jest.fn(),
    updateProduct: jest.fn(),
  };
  let service: SellersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SellersService(
      { prisma } as any,
      usersService as any,
      productsService as any,
      bankingService as any,
      {} as any,
      uploadService as any,
    );
    delete (prisma as any).$transaction;
    usersService.findById.mockResolvedValue({
      id: 'user-id',
      email: 'seller@example.com',
      isVerified: true,
      accountType: 'buyer',
      accountTypes: ['buyer'],
    });
    prisma.sellerProfile.findFirst.mockResolvedValue(null);
    prisma.sellerProfile.create.mockResolvedValue(profile);
    uploadService.uploadPrivateSellerDocument.mockResolvedValue({
      storageKey: 'private/key',
      resourceType: 'raw',
      format: 'pdf',
      sizeBytes: 100,
    });
    prisma.sellerApplicationDocument.create.mockResolvedValue({
      id: 'document-id',
      documentType: 'government_id',
      originalFileName: 'id.pdf',
      contentType: 'application/pdf',
      sizeBytes: 100,
      createdAt: new Date(),
    });
    productsService.createMyProduct.mockResolvedValue({ id: 'product-id', isActive: false });
    productsService.findMyProducts.mockResolvedValue({ items: [], pagination: { totalItems: 0 } });
    productsService.updateProduct.mockResolvedValue({ id: 'product-id', isActive: false });
  });

  it('creates a seller application draft on the existing verified buyer account', async () => {
    const result = await service.saveMyApplication('user-id', {
      applicantType: SellerApplicantType.INDIVIDUAL,
      businessName: ' Sample Shop ',
      businessAddress: ' Lagos ',
      businessType: BusinessType.INDIVIDUAL,
    });

    expect(prisma.sellerProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-id',
          applicantType: SellerApplicantType.INDIVIDUAL,
          businessName: 'Sample Shop',
          businessRegistrationNumber: null,
          businessAddress: 'Lagos',
          applicationStatus: SellerApplicationStatus.DRAFT,
          isApproved: false,
        }),
      }),
    );
    expect(result).toMatchObject({ applicationStatus: SellerApplicationStatus.DRAFT });
  });

  it('requires email verification before saving the application', async () => {
    usersService.findById.mockResolvedValue({
      email: 'seller@example.com',
      isVerified: false,
      accountTypes: ['buyer'],
    });

    await expect(
      service.saveMyApplication('user-id', {
        applicantType: SellerApplicantType.INDIVIDUAL,
        businessName: 'Sample Shop',
        businessAddress: 'Lagos',
        businessType: BusinessType.INDIVIDUAL,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.sellerProfile.create).not.toHaveBeenCalled();
  });

  it('does not allow an application to be edited while it is under review', async () => {
    prisma.sellerProfile.findFirst.mockResolvedValue({
      ...profile,
      applicationStatus: SellerApplicationStatus.PENDING,
    });

    await expect(
      service.saveMyApplication('user-id', {
        applicantType: SellerApplicantType.INDIVIDUAL,
        businessName: 'Updated Shop',
        businessAddress: 'Lagos',
        businessType: BusinessType.INDIVIDUAL,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.sellerProfile.update).not.toHaveBeenCalled();
  });

  it('submits only after the required documents and verified payout account exist', async () => {
    prisma.sellerProfile.findFirst.mockResolvedValue({
      ...profile,
      bankVerifiedAt: new Date(),
      bankVerificationProvider: 'paystack',
      documents: [{ documentType: 'government_id' }],
    });
    const tx = {
      sellerProfile: { update: jest.fn() },
      sellerApplicationReview: { create: jest.fn() },
    };
    (prisma as any).$transaction = jest.fn((operation) => operation(tx));

    await expect(service.submitMyApplication('user-id')).resolves.toMatchObject({
      applicationStatus: SellerApplicationStatus.PENDING,
    });
    expect(tx.sellerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'profile-id' },
        data: expect.objectContaining({ applicationStatus: SellerApplicationStatus.PENDING }),
      }),
    );
    expect(tx.sellerApplicationReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'user-id',
          fromStatus: SellerApplicationStatus.DRAFT,
          toStatus: SellerApplicationStatus.PENDING,
        }),
      }),
    );
  });

  it('refuses submission when required identity documents are missing', async () => {
    prisma.sellerProfile.findFirst.mockResolvedValue({
      ...profile,
      bankVerifiedAt: new Date(),
      bankVerificationProvider: 'paystack',
      documents: [],
    });

    await expect(service.submitMyApplication('user-id')).rejects.toThrow(
      'Upload the required identity documents before submitting',
    );
    expect((prisma as any).$transaction).toBeUndefined();
  });

  it('uploads required seller documents to private storage and stores metadata only in its response', async () => {
    prisma.sellerProfile.findFirst.mockResolvedValue({
      ...profile,
      requestedDocumentTypes: [],
      documents: [],
    });
    const result = await service.uploadApplicationDocument(
      'user-id',
      'government_id' as any,
      {
        originalname: 'id.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf'),
      } as any,
    );

    expect(uploadService.uploadPrivateSellerDocument).toHaveBeenCalled();
    expect(prisma.sellerApplicationDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storageKey: 'private/key',
          resourceType: 'raw',
          format: 'pdf',
        }),
        select: expect.not.objectContaining({ storageKey: true }),
      }),
    );
    expect(result).not.toHaveProperty('storageKey');
  });

  it('does not upload a document when the same active document type already exists', async () => {
    prisma.sellerProfile.findFirst.mockResolvedValue({
      ...profile,
      requestedDocumentTypes: [],
      documents: [{ documentType: 'government_id' }],
    });

    await expect(
      service.uploadApplicationDocument(
        'user-id',
        'government_id' as any,
        {
          originalname: 'id.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('pdf'),
        } as any,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(uploadService.uploadPrivateSellerDocument).not.toHaveBeenCalled();
  });

  it('only accepts extra seller documents when a reviewer requested that document type', async () => {
    prisma.sellerProfile.findFirst.mockResolvedValue({
      ...profile,
      requestedDocumentTypes: [],
      documents: [],
    });
    await expect(
      service.uploadApplicationDocument(
        'user-id',
        'other' as any,
        {
          originalname: 'extra.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('pdf'),
        } as any,
      ),
    ).rejects.toThrow('This document type was not requested for this application');
    expect(uploadService.uploadPrivateSellerDocument).not.toHaveBeenCalled();
  });

  it('creates product drafts on an inactive application storefront regardless of requested publish state', async () => {
    prisma.sellerProfile.findFirst.mockResolvedValue({ ...profile });
    prisma.seller.findFirst.mockResolvedValue(null);
    const createStore = jest.fn().mockResolvedValue({ id: 'store-id' });
    (service as any).sellersRepository.create = createStore;

    await service.createApplicationProductDraft({ userId: 'user-id', accountType: 'buyer' }, {
      name: 'Private item',
      isActive: true,
    } as any);

    expect(createStore).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    expect(productsService.createMyProduct).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Private item', isActive: false }),
      expect.objectContaining({ userId: 'user-id' }),
    );
  });

  it('takes an approved storefront offline without changing product or order records', async () => {
    prisma.sellerProfile.findFirst.mockResolvedValue({
      ...profile,
      applicationStatus: SellerApplicationStatus.APPROVED,
    });
    prisma.seller.findFirst.mockResolvedValue({ id: 'store-id', ownerId: 'user-id' });
    prisma.seller.update.mockResolvedValue({ id: 'store-id', isActive: false });

    await expect(service.setMyStorefrontActive('user-id', false)).resolves.toMatchObject({
      isActive: false,
    });
    expect(prisma.seller.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'store-id' },
        data: { isActive: false },
      }),
    );
  });

  it('does not allow applicants to manage product drafts after approval through the application route', async () => {
    prisma.sellerProfile.findFirst.mockResolvedValue({
      ...profile,
      applicationStatus: SellerApplicationStatus.APPROVED,
    });
    await expect(
      service.createApplicationProductDraft({ userId: 'user-id', accountType: 'seller' }, {
        name: 'Private item',
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(productsService.createMyProduct).not.toHaveBeenCalled();
  });
});
