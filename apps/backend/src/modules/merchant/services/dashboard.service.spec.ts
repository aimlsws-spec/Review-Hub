import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  MerchantCampaignStatsRepository,
  MerchantRepository,
  MerchantTeamRepository,
  MerchantWalletRepository,
} from '../repositories';

import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockMerchantRepository = {
    findById: jest.fn(),
  };

  const mockTeamRepository = {
    findByMerchantId: jest.fn(),
  };

  const mockWalletRepository = {
    findByMerchantId: jest.fn(),
  };

  const mockCampaignStatsRepository = {
    getStats: jest.fn(),
  };

  const mockMerchant = {
    id: 'merchant-1',
    userId: 'user-1',
    businessName: 'Acme Corp',
    email: 'acme@test.com',
    phone: '+919876543210',
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const mockWallet = {
    id: 'wallet-1',
    merchantId: 'merchant-1',
    availableBalance: 1000,
    reservedBalance: 200,
    totalTopUp: 5000,
    totalSpent: 3800,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTeamMembers = [
    { id: 'member-1', merchantId: 'merchant-1', userId: 'user-1', role: 'ADMIN', status: 'ACTIVE' },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: MerchantRepository, useValue: mockMerchantRepository },
        { provide: MerchantTeamRepository, useValue: mockTeamRepository },
        { provide: MerchantWalletRepository, useValue: mockWalletRepository },
        { provide: MerchantCampaignStatsRepository, useValue: mockCampaignStatsRepository },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    jest.clearAllMocks();
  });

  it('should return dashboard data', async () => {
    mockMerchantRepository.findById.mockResolvedValue(mockMerchant);
    mockWalletRepository.findByMerchantId.mockResolvedValue(mockWallet);
    mockTeamRepository.findByMerchantId.mockResolvedValue(mockTeamMembers);
    mockCampaignStatsRepository.getStats.mockResolvedValue({
      totalCampaigns: 5,
      activeCampaigns: 2,
      totalBudget: 50000,
      spentBudget: 12000,
      totalParticipants: 340,
    });

    const result = await service.getDashboard('merchant-1');
    expect(result).toHaveProperty('merchant');
    expect(result).toHaveProperty('wallet');
    expect(result).toHaveProperty('team');
    expect(result.merchant).toHaveProperty('businessName', 'Acme Corp');
    expect(result.wallet).toHaveProperty('availableBalance', 1000);
    expect(result.team).toHaveProperty('totalMembers', 1);
    expect(result).toMatchObject({
      totalCampaigns: 5,
      activeCampaigns: 2,
      totalParticipants: 340,
      totalBudget: '50000',
      totalSpent: '12000',
      walletBalance: '1000',
      pendingVerification: true,
      merchantStatus: 'ACTIVE',
    });
  });

  it('reports pendingVerification false once the merchant is APPROVED', async () => {
    mockMerchantRepository.findById.mockResolvedValue({ ...mockMerchant, verificationStatus: 'APPROVED' });
    mockWalletRepository.findByMerchantId.mockResolvedValue(mockWallet);
    mockTeamRepository.findByMerchantId.mockResolvedValue(mockTeamMembers);
    mockCampaignStatsRepository.getStats.mockResolvedValue({
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalBudget: 0,
      spentBudget: 0,
      totalParticipants: 0,
    });

    const result = await service.getDashboard('merchant-1');

    expect(result.pendingVerification).toBe(false);
    expect(result.totalBudget).toBe('0');
  });

  it('should throw NotFoundException for unknown merchant', async () => {
    mockMerchantRepository.findById.mockResolvedValue(null);

    await expect(service.getDashboard('unknown')).rejects.toThrow(NotFoundException);
  });
});
