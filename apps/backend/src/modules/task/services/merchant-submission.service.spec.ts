import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { LocalStorageService } from '../../../storage/storage.service';
import { TaskSubmissionRepository } from '../repositories';

import { MerchantSubmissionService } from './merchant-submission.service';
import { SubmissionService } from './submission.service';

describe('MerchantSubmissionService', () => {
  const repository = { findForMerchant: jest.fn(), findOneForMerchant: jest.fn() };
  const submissions = { approve: jest.fn(), reject: jest.fn() };
  const storage = { fileExists: jest.fn(), getFilePath: jest.fn() };
  const service = new MerchantSubmissionService(
    repository as unknown as TaskSubmissionRepository,
    submissions as unknown as SubmissionService,
    storage as unknown as LocalStorageService,
  );

  const row = {
    id: 'submission-1',
    status: 'PENDING_MANUAL',
    verificationSource: 'HYBRID',
    attemptNumber: 1,
    createdAt: new Date('2026-10-08T10:00:00Z'),
    reviewedAt: null,
    rejectionReason: null,
    rewardAmount: null,
    fileUrl: 'submissions/c/t/proof.png',
    externalUrl: null,
    task: { id: 'task-1', title: 'Share your post', taskType: 'INSTAGRAM_STORY_SHARE', proofType: 'SCREENSHOT', verificationType: 'HYBRID', campaign: { id: 'campaign-1', title: 'Mango Cafe' } },
    user: { firstName: 'Prerna', lastName: 'Mishra' },
    attachments: [{ mimeType: 'image/png', fileName: 'proof.png' }],
    aiJob: { status: 'COMPLETED', auditLog: { decision: 'APPROVE', confidence: 0.9, fraudScore: 0.1, explanation: 'Looks like a real story.' } },
    fraudFlags: [{ type: 'DUPLICATE_SUBMISSION', riskLevel: 'LOW', reason: 'Same file as before' }],
  };

  beforeEach(() => jest.resetAllMocks());

  it('shows a reviewer the task, the evidence, the AI verdict and open flags, and only a first name and initial', async () => {
    repository.findOneForMerchant.mockResolvedValue(row);

    const view = await service.get('merchant-1', 'submission-1');

    expect(repository.findOneForMerchant).toHaveBeenCalledWith('submission-1', 'merchant-1');
    expect(view).toMatchObject({
      participantName: 'Prerna M.',
      evidence: { file: { mimeType: 'image/png', fileName: 'proof.png' }, link: null },
      ai: { decision: 'APPROVE', confidence: 0.9, explanation: 'Looks like a real story.' },
      flags: [{ type: 'DUPLICATE_SUBMISSION', riskLevel: 'LOW', reason: 'Same file as before' }],
    });
    expect(view).not.toHaveProperty('userId');
  });

  it("says not found for a submission to another merchant's campaign, and decides nothing", async () => {
    repository.findOneForMerchant.mockResolvedValue(null);

    await expect(service.approve('merchant-2', 'submission-1', 'reviewer-1')).rejects.toThrow(NotFoundException);
    await expect(service.getEvidenceFilePath('merchant-2', 'submission-1')).rejects.toThrow(NotFoundException);
    expect(submissions.approve).not.toHaveBeenCalled();
  });

  it('decides as the merchant, through the same approval an admin uses', async () => {
    repository.findOneForMerchant.mockResolvedValue(row);

    await service.approve('merchant-1', 'submission-1', 'reviewer-1');
    await service.reject('merchant-1', 'submission-1', 'reviewer-1', { rejectionReason: 'Not our post' });

    expect(submissions.approve).toHaveBeenCalledWith('submission-1', 'reviewer-1', 'MERCHANT');
    expect(submissions.reject).toHaveBeenCalledWith('submission-1', 'reviewer-1', { rejectionReason: 'Not our post' }, 'MERCHANT');
  });

  it('says not found when the evidence file is gone from disk', async () => {
    repository.findOneForMerchant.mockResolvedValue(row);
    storage.fileExists.mockResolvedValue(false);

    await expect(service.getEvidenceFilePath('merchant-1', 'submission-1')).rejects.toThrow('Evidence file');
  });
});
