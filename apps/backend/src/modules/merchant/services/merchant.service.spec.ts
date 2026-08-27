import { ConflictException, NotFoundException } from '@common/exceptions/domain.exceptions';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { MerchantRepository, MerchantDocumentRepository, MerchantTeamRepository } from '../repositories';

import { MerchantService } from './merchant.service';

describe('MerchantService', () => {
  let service: MerchantService;

  const mockMerchantRepository = {
    findByEmail: jest.fn(),
    findByGst: jest.fn(),
    findByPan: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockDocumentRepository = {
    findByMerchantId: jest.fn(),
  };

  const mockTeamRepository = {
    create: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockMerchant = {
    id: 'merchant-1',
    userId: 'user-1',
    businessName: 'Acme Corp',
    email: 'acme@test.com',
    phone: '+919876543210',
    status: 'ACTIVE',
    verificationStatus: 'NOT_SUBMITTED',
    createdAt: new Date(),
    updatedAt: new Date(),
    country: null,
    state: null,
    city: null,
    wallet: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantService,
        { provide: MerchantRepository, useValue: mockMerchantRepository },
        { provide: MerchantDocumentRepository, useValue: mockDocumentRepository },
        { provide: MerchantTeamRepository, useValue: mockTeamRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<MerchantService>(MerchantService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = {
      businessName: 'Acme Corp',
      email: 'acme@test.com',
      phone: '+919876543210',
      businessType: 'Private Limited',
      businessCategory: 'Technology',
      description: 'A test company',
    };

    it('should register a new merchant', async () => {
      mockMerchantRepository.findByEmail.mockResolvedValue(null);
      mockMerchantRepository.create.mockResolvedValue(mockMerchant);
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockTeamRepository.create.mockResolvedValue({});

      const result = await service.register('user-1', dto);

      expect(result).toEqual(mockMerchant);
      expect(mockMerchantRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          businessName: 'Acme Corp',
          user: { connect: { id: 'user-1' } },
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('merchant.registered', expect.any(Object));
    });

    it('creates an OWNER team-membership row for the registering user, so they can later invite teammates', async () => {
      mockMerchantRepository.findByEmail.mockResolvedValue(null);
      mockMerchantRepository.create.mockResolvedValue(mockMerchant);
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockTeamRepository.create.mockResolvedValue({});

      await service.register('user-1', dto);

      expect(mockTeamRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          merchant: { connect: { id: mockMerchant.id } },
          user: { connect: { id: 'user-1' } },
          role: 'OWNER',
          status: 'ACTIVE',
        }),
      );
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockMerchantRepository.findByEmail.mockResolvedValue(mockMerchant);

      await expect(service.register('user-1', dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for duplicate GST', async () => {
      mockMerchantRepository.findByEmail.mockResolvedValue(null);
      mockMerchantRepository.findByGst.mockResolvedValue(mockMerchant);

      await expect(service.register('user-1', { ...dto, gstNumber: '22AAAAA0000A1Z5' })).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for duplicate PAN', async () => {
      mockMerchantRepository.findByEmail.mockResolvedValue(null);
      mockMerchantRepository.findByPan.mockResolvedValue(mockMerchant);

      await expect(service.register('user-1', { ...dto, panNumber: 'AAAAA0000A' })).rejects.toThrow(ConflictException);
    });
  });

  describe('getProfile', () => {
    it('should return merchant by id', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);

      const result = await service.getProfile('merchant-1');
      expect(result).toEqual(mockMerchant);
    });

    it('should throw NotFoundException for unknown merchant', async () => {
      mockMerchantRepository.findById.mockResolvedValue(null);

      await expect(service.getProfile('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProfileByUserId', () => {
    it('resolves the merchant that belongs to the given user, not by merchant id', async () => {
      mockMerchantRepository.findByUserId.mockResolvedValue(mockMerchant);

      const result = await service.getProfileByUserId('user-1');

      expect(mockMerchantRepository.findByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockMerchant);
    });

    it('throws NotFoundException when the user has no merchant account', async () => {
      mockMerchantRepository.findByUserId.mockResolvedValue(null);

      await expect(service.getProfileByUserId('user-without-merchant')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update merchant profile', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockMerchantRepository.update.mockResolvedValue({ ...mockMerchant, businessName: 'Updated Corp' });

      const result = await service.updateProfile('merchant-1', { businessName: 'Updated Corp' });
      expect(result).toHaveProperty('businessName', 'Updated Corp');
    });
  });

  describe('getVerificationStatus', () => {
    it('should return verification status with documents', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockDocumentRepository.findByMerchantId.mockResolvedValue([]);

      const result = await service.getVerificationStatus('merchant-1');
      expect(result).toHaveProperty('status', 'ACTIVE');
      expect(result).toHaveProperty('verificationStatus', 'NOT_SUBMITTED');
      expect(result).toHaveProperty('documents', []);
    });
  });
});
