import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { POLICY_DOCUMENTS } from '../constants';
import { PolicyAcceptanceRepository } from '../repositories/policy-acceptance.repository';

import { PolicyAcceptanceService } from './policy-acceptance.service';

describe('PolicyAcceptanceService', () => {
  let service: PolicyAcceptanceService;

  const mockRepository = { findAccepted: jest.fn(), createMany: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };
  const current = POLICY_DOCUMENTS.map(({ policy, version }) => ({ policy, version }));
  const acceptedAt = new Date('2026-10-01T10:00:00Z');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyAcceptanceService,
        { provide: PolicyAcceptanceRepository, useValue: mockRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<PolicyAcceptanceService>(PolicyAcceptanceService);
    jest.clearAllMocks();
  });

  it('reports every document in force, with when its current version was accepted', async () => {
    mockRepository.findAccepted.mockResolvedValue([{ policy: 'TERMS_OF_SERVICE', version: POLICY_DOCUMENTS[0].version, acceptedAt }]);

    const status = await service.getStatus('user-1');

    expect(status).toHaveLength(POLICY_DOCUMENTS.length);
    expect(status[0]).toEqual(expect.objectContaining({ policy: 'TERMS_OF_SERVICE', slug: 'terms-and-conditions', acceptedAt }));
    expect(status[1].acceptedAt).toBeNull();
  });

  it('treats an older version as not accepted', async () => {
    mockRepository.findAccepted.mockResolvedValue([{ policy: 'PRIVACY_POLICY', version: '2020-01-01', acceptedAt }]);

    await expect(service.getPending('user-1')).resolves.toEqual(POLICY_DOCUMENTS.map((d) => d.policy));
  });

  it('has nothing pending once every current version is accepted', async () => {
    mockRepository.findAccepted.mockResolvedValue(current.map((d) => ({ ...d, acceptedAt })));

    await expect(service.getPending('user-1')).resolves.toEqual([]);
  });

  it('accepts every current version and records it in the audit trail', async () => {
    mockRepository.createMany.mockResolvedValue({ count: 3 });
    mockRepository.findAccepted.mockResolvedValue(current.map((d) => ({ ...d, acceptedAt })));

    const status = await service.acceptCurrent('user-1', '10.0.0.1', 'UA');

    expect(mockRepository.createMany).toHaveBeenCalledWith('user-1', current, '10.0.0.1', 'UA');
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('auth.policies.accepted', { userId: 'user-1', ipAddress: '10.0.0.1', documents: current });
    expect(status.every((s) => s.acceptedAt !== null)).toBe(true);
  });

  it('records nothing new when everything was already accepted', async () => {
    mockRepository.createMany.mockResolvedValue({ count: 0 });
    mockRepository.findAccepted.mockResolvedValue([]);

    await service.acceptCurrent('user-1');

    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });
});
