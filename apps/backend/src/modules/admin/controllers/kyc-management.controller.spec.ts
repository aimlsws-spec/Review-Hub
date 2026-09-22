import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';

import { KycReviewQueryDto, RejectKycDto } from '../dto';
import { KycManagementService } from '../services/kyc-management.service';

import { KycManagementController } from './kyc-management.controller';

describe('KycManagementController', () => {
  let controller: KycManagementController;

  const mockService = {
    list: jest.fn(),
    getById: jest.fn(),
    getFilePath: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KycManagementController],
      providers: [{ provide: KycManagementService, useValue: mockService }],
    }).compile();

    controller = module.get<KycManagementController>(KycManagementController);
    jest.clearAllMocks();
  });

  it('list delegates the validated query to the service', async () => {
    const query = new KycReviewQueryDto();
    await controller.list(query);
    expect(mockService.list).toHaveBeenCalledWith(query);
  });

  it('getOne delegates to the service', async () => {
    await controller.getOne('doc-1');
    expect(mockService.getById).toHaveBeenCalledWith('doc-1');
  });

  it('approve passes the acting admin id', async () => {
    await controller.approve('doc-1', 'admin-1');
    expect(mockService.approve).toHaveBeenCalledWith('doc-1', 'admin-1');
  });

  it('reject passes the reason and the acting admin id', async () => {
    await controller.reject('doc-1', { reason: 'Blurry image' }, 'admin-1');
    expect(mockService.reject).toHaveBeenCalledWith('doc-1', 'admin-1', 'Blurry image');
  });

  it('getFile streams the file with caching disabled', async () => {
    mockService.getFilePath.mockResolvedValue('/abs/pan.jpg');
    const res = { setHeader: jest.fn(), sendFile: jest.fn() } as unknown as Response;

    await controller.getFile('doc-1', 'admin-1', res);

    expect(mockService.getFilePath).toHaveBeenCalledWith('doc-1', 'admin-1');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(res.sendFile).toHaveBeenCalledWith('/abs/pan.jpg');
  });
});

describe('KYC review DTO validation', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = <T>(metatype: new () => T, value: unknown) => pipe.transform(value, { type: 'body', metatype });

  it('rejects an empty or too-short rejection reason', async () => {
    await expect(validate(RejectKycDto, { reason: '' })).rejects.toBeDefined();
    await expect(validate(RejectKycDto, { reason: 'no' })).rejects.toBeDefined();
    await expect(validate(RejectKycDto, {})).rejects.toBeDefined();
  });

  it('treats a whitespace-only reason as empty', async () => {
    await expect(validate(RejectKycDto, { reason: '      ' })).rejects.toBeDefined();
  });

  it('trims the reason and rejects unknown fields', async () => {
    await expect(validate(RejectKycDto, { reason: '  Blurry image  ' })).resolves.toEqual({ reason: 'Blurry image' });
    await expect(validate(RejectKycDto, { reason: 'Blurry image', status: 'APPROVED' })).rejects.toBeDefined();
  });

  it('rejects an unknown status filter and accepts a valid one', async () => {
    await expect(validate(KycReviewQueryDto, { status: 'MAYBE' })).rejects.toBeDefined();
    await expect(validate(KycReviewQueryDto, { status: 'PENDING', documentType: 'PAN' })).resolves.toMatchObject({
      status: 'PENDING',
      documentType: 'PAN',
    });
  });
});
