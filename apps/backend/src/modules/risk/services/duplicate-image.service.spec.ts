import { Test, TestingModule } from '@nestjs/testing';

import { DUPLICATE_LOOKBACK_DAYS, DUPLICATE_MAX_MATCHES, PERCEPTUAL_MAX_DISTANCE } from '../constants';
import { DuplicateImageRepository, SubmissionSignalRepository } from '../repositories';

import { DuplicateImageService } from './duplicate-image.service';

describe('DuplicateImageService', () => {
  let service: DuplicateImageService;

  const mockDuplicateRepository = { saveFingerprint: jest.fn(), findSimilar: jest.fn() };
  const mockSignalRepository = { createFlag: jest.fn(), hasFlagAbout: jest.fn() };

  const HASH = '9f3a1c0e7b2d4a58';
  const screen = 'you are following viralkar official on instagram today';
  const params = { submissionId: 'sub-1', userId: 'user-1', perceptualHash: HASH, evidenceText: screen };
  const match = (overrides = {}) => ({ submissionId: 'sub-2', userId: 'user-2', evidenceText: screen, distance: 1, ...overrides });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuplicateImageService,
        { provide: DuplicateImageRepository, useValue: mockDuplicateRepository },
        { provide: SubmissionSignalRepository, useValue: mockSignalRepository },
      ],
    }).compile();

    service = module.get<DuplicateImageService>(DuplicateImageService);
    jest.clearAllMocks();
    mockDuplicateRepository.findSimilar.mockResolvedValue([]);
    mockSignalRepository.hasFlagAbout.mockResolvedValue(false);
  });

  describe('storing the fingerprint', () => {
    it('saves it as the signed integer the database holds, before comparing anything', async () => {
      const order: string[] = [];
      mockDuplicateRepository.saveFingerprint.mockImplementation(async () => void order.push('save'));
      mockDuplicateRepository.findSimilar.mockImplementation(async () => {
        order.push('compare');
        return [];
      });

      await service.check(params);

      expect(order).toEqual(['save', 'compare']);
      expect(mockDuplicateRepository.saveFingerprint).toHaveBeenCalledWith('sub-1', BigInt.asIntN(64, BigInt(`0x${HASH}`)), screen);
    });

    it('keeps "OCR did not run" as null', async () => {
      await service.check({ ...params, evidenceText: undefined });

      expect(mockDuplicateRepository.saveFingerprint).toHaveBeenCalledWith('sub-1', expect.any(BigInt), null);
    });

    it('ignores a malformed fingerprint without touching the database', async () => {
      await expect(service.check({ ...params, perceptualHash: 'not-a-hash' })).resolves.toBeNull();

      expect(mockDuplicateRepository.saveFingerprint).not.toHaveBeenCalled();
      expect(mockDuplicateRepository.findSimilar).not.toHaveBeenCalled();
    });
  });

  describe('searching', () => {
    it('looks for close pictures within the configured distance and recent window', async () => {
      const before = Date.now();
      await service.check(params);

      const search = mockDuplicateRepository.findSimilar.mock.calls[0][0];
      expect(search).toEqual(
        expect.objectContaining({ submissionId: 'sub-1', maxDistance: PERCEPTUAL_MAX_DISTANCE, limit: DUPLICATE_MAX_MATCHES }),
      );
      const windowMs = before - search.since.getTime();
      expect(Math.abs(windowMs - DUPLICATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)).toBeLessThan(5_000);
    });

    it('raises nothing for a picture nobody has sent before', async () => {
      await expect(service.check(params)).resolves.toBeNull();

      expect(mockSignalRepository.createFlag).not.toHaveBeenCalled();
    });
  });

  describe("another user's matching picture", () => {
    it('raises a HIGH duplicate flag naming the match, when the text agrees', async () => {
      mockDuplicateRepository.findSimilar.mockResolvedValue([match({ distance: 2 })]);

      await expect(service.check(params)).resolves.toBe('HIGH');

      expect(mockSignalRepository.createFlag).toHaveBeenCalledWith({
        submissionId: 'sub-1',
        userId: 'user-1',
        type: 'DUPLICATE_SUBMISSION',
        riskLevel: 'HIGH',
        reason: expect.stringMatching(/different user/),
        metadata: { kind: 'perceptual', matchedSubmissionId: 'sub-2', matchedUserId: 'user-2', differingBits: 2, otherMatches: [] },
      });
    });

    it('raises nothing when the screens look alike but say different things', async () => {
      mockDuplicateRepository.findSimilar.mockResolvedValue([
        match({ evidenceText: 'arjun mehta requested to follow brandname studio with 9800 followers and 431 posts' }),
      ]);

      await expect(service.check({ ...params, evidenceText: 'priya sharma is following viralkar official with 204 followers and 12 posts' })).resolves.toBeNull();

      expect(mockSignalRepository.createFlag).not.toHaveBeenCalled();
    });

    it('raises only a MEDIUM flag when the text could not be compared', async () => {
      mockDuplicateRepository.findSimilar.mockResolvedValue([match({ evidenceText: null })]);

      await expect(service.check(params)).resolves.toBe('MEDIUM');
    });

    it('treats two matching photos (no text on either) as HIGH', async () => {
      mockDuplicateRepository.findSimilar.mockResolvedValue([match({ evidenceText: '' })]);

      await expect(service.check({ ...params, evidenceText: '' })).resolves.toBe('HIGH');
    });
  });

  describe("the user's own earlier picture", () => {
    it('raises only a LOW note', async () => {
      mockDuplicateRepository.findSimilar.mockResolvedValue([match({ userId: 'user-1' })]);

      await expect(service.check(params)).resolves.toBe('LOW');
    });
  });

  describe('several matches', () => {
    it('reports one flag for the most serious match, listing the others', async () => {
      mockDuplicateRepository.findSimilar.mockResolvedValue([
        match({ submissionId: 'own', userId: 'user-1', distance: 0 }),
        match({ submissionId: 'far', userId: 'user-3', distance: 5 }),
        match({ submissionId: 'near', userId: 'user-2', distance: 1 }),
      ]);

      await service.check(params);

      expect(mockSignalRepository.createFlag).toHaveBeenCalledTimes(1);
      const flag = mockSignalRepository.createFlag.mock.calls[0][0];
      expect(flag.riskLevel).toBe('HIGH');
      // Of the two HIGH matches (another user's), the closer picture is the one reported.
      expect(flag.metadata.matchedSubmissionId).toBe('near');
      expect(flag.metadata.otherMatches).toEqual(expect.arrayContaining(['own', 'far']));
    });

    it('lets a serious match outrank a closer but minor one', async () => {
      mockDuplicateRepository.findSimilar.mockResolvedValue([
        match({ submissionId: 'own', userId: 'user-1', distance: 0 }),
        match({ submissionId: 'theirs', userId: 'user-2', distance: 4 }),
      ]);

      await service.check(params);

      expect(mockSignalRepository.createFlag.mock.calls[0][0].metadata.matchedSubmissionId).toBe('theirs');
    });
  });

  describe('not flagging the same match twice', () => {
    it('skips the flag when the exact-checksum check already raised one about this match', async () => {
      mockDuplicateRepository.findSimilar.mockResolvedValue([match()]);
      mockSignalRepository.hasFlagAbout.mockResolvedValue(true);

      await expect(service.check(params)).resolves.toBeNull();

      expect(mockSignalRepository.hasFlagAbout).toHaveBeenCalledWith('sub-1', 'DUPLICATE_SUBMISSION', 'sub-2');
      expect(mockSignalRepository.createFlag).not.toHaveBeenCalled();
    });
  });

  it('lets a database failure propagate, so the caller can refuse to auto-approve', async () => {
    mockDuplicateRepository.findSimilar.mockRejectedValue(new Error('database unavailable'));

    await expect(service.check(params)).rejects.toThrow('database unavailable');
  });
});
