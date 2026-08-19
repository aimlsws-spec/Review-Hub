import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { MerchantRepository, MerchantTeamRepository, MerchantInvitationRepository } from '../repositories';

import { TeamService } from './team.service';

describe('TeamService', () => {
  let service: TeamService;

  const mockMerchantRepository = {
    findById: jest.fn(),
  };

  const mockTeamRepository = {
    findByMerchantAndUser: jest.fn(),
    countByMerchantId: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    findByMerchantId: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockInvitationRepository = {
    findPendingByMerchantAndEmail: jest.fn(),
    create: jest.fn(),
    findByToken: jest.fn(),
    update: jest.fn(),
    findByMerchantId: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockMerchant = {
    id: 'merchant-1',
    userId: 'user-owner',
    businessName: 'Acme Corp',
    email: 'acme@test.com',
    phone: '+919876543210',
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const mockAdminMember = {
    id: 'member-1',
    merchantId: 'merchant-1',
    userId: 'user-admin',
    role: 'ADMIN',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        { provide: MerchantRepository, useValue: mockMerchantRepository },
        { provide: MerchantTeamRepository, useValue: mockTeamRepository },
        { provide: MerchantInvitationRepository, useValue: mockInvitationRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
    jest.clearAllMocks();
  });

  describe('invite', () => {
    const dto = { email: 'teammate@test.com', role: 'MANAGER' as const };

    it('should invite a team member', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockTeamRepository.findByMerchantAndUser.mockResolvedValue(mockAdminMember);
      mockTeamRepository.countByMerchantId.mockResolvedValue(5);
      mockInvitationRepository.findPendingByMerchantAndEmail.mockResolvedValue(null);
      mockInvitationRepository.create.mockResolvedValue({
        id: 'invite-1',
        merchantId: 'merchant-1',
        email: 'teammate@test.com',
        role: 'MANAGER',
        inviteToken: 'token',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });

      const result = await service.invite('merchant-1', 'user-admin', dto);

      expect(result).toHaveProperty('email', 'teammate@test.com');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('merchant.team.invited', expect.any(Object));
    });

    it('should allow the merchant OWNER to invite, not just ADMIN', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockTeamRepository.findByMerchantAndUser.mockResolvedValue({ ...mockAdminMember, role: 'OWNER' });
      mockTeamRepository.countByMerchantId.mockResolvedValue(5);
      mockInvitationRepository.findPendingByMerchantAndEmail.mockResolvedValue(null);
      mockInvitationRepository.create.mockResolvedValue({
        id: 'invite-2',
        merchantId: 'merchant-1',
        email: 'teammate@test.com',
        role: 'MANAGER',
        inviteToken: 'token',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });

      const result = await service.invite('merchant-1', 'user-owner', dto);

      expect(result).toHaveProperty('email', 'teammate@test.com');
    });

    it('should throw ForbiddenException for non-admin', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockTeamRepository.findByMerchantAndUser.mockResolvedValue({ ...mockAdminMember, role: 'VIEWER' });

      await expect(service.invite('merchant-1', 'user-viewer', dto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException for duplicate invitation', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockTeamRepository.findByMerchantAndUser.mockResolvedValue(mockAdminMember);
      mockTeamRepository.countByMerchantId.mockResolvedValue(5);
      mockInvitationRepository.findPendingByMerchantAndEmail.mockResolvedValue({ id: 'existing' });

      await expect(service.invite('merchant-1', 'user-admin', dto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException at member limit', async () => {
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
      mockTeamRepository.findByMerchantAndUser.mockResolvedValue(mockAdminMember);
      mockTeamRepository.countByMerchantId.mockResolvedValue(20);

      await expect(service.invite('merchant-1', 'user-admin', dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptInvitation', () => {
    const mockInvitation = {
      id: 'invite-1',
      merchantId: 'merchant-1',
      email: 'teammate@test.com',
      role: 'MANAGER',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      inviteToken: 'valid-token',
    };

    it('should accept invitation', async () => {
      mockInvitationRepository.findByToken.mockResolvedValue(mockInvitation);
      mockTeamRepository.findByMerchantAndUser.mockResolvedValue(null);
      mockTeamRepository.create.mockResolvedValue({ id: 'member-new' });

      const result = await service.acceptInvitation('valid-token', 'user-new', 'teammate@test.com');
      expect(result).toEqual({ message: 'Invitation accepted successfully' });
    });

    it('should throw BadRequestException for expired invitation', async () => {
      mockInvitationRepository.findByToken.mockResolvedValue({
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });

      await expect(service.acceptInvitation('expired', 'user-new', 'teammate@test.com')).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeTeamMember', () => {
    const mockMember = {
      id: 'member-1',
      merchantId: 'merchant-1',
      userId: 'user-member',
      role: 'VIEWER',
    };

    it('should remove a team member', async () => {
      mockTeamRepository.findById.mockResolvedValue(mockMember);
      mockMerchantRepository.findById.mockResolvedValue(mockMerchant);

      const result = await service.removeTeamMember('merchant-1', 'member-1');
      expect(result).toEqual({ message: 'Team member removed successfully' });
    });

    it('should throw BadRequestException when removing owner', async () => {
      mockTeamRepository.findById.mockResolvedValue({ ...mockMember, userId: 'user-owner' });

      await expect(service.removeTeamMember('merchant-1', 'member-1')).rejects.toThrow(BadRequestException);
    });
  });
});
