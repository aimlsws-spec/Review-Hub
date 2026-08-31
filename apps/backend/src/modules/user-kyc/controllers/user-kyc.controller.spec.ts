import { Test, TestingModule } from '@nestjs/testing';

import { UserKycService } from '../services';

import { UserKycController } from './user-kyc.controller';

describe('UserKycController', () => {
  let controller: UserKycController;

  const mockUserKycService = {
    uploadDocument: jest.fn(),
    getDocuments: jest.fn(),
    getDocumentFilePath: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserKycController],
      providers: [{ provide: UserKycService, useValue: mockUserKycService }],
    }).compile();

    controller = module.get<UserKycController>(UserKycController);
    jest.clearAllMocks();
  });

  it('uploadKyc should delegate to the service with the userId from @CurrentUser', async () => {
    const dto = { documentType: 'PAN', documentNumber: 'AAAAA0000A' };
    const file = { originalname: 'pan.jpg' } as Express.Multer.File;

    await controller.uploadKyc(dto as never, file, 'user-1');
    expect(mockUserKycService.uploadDocument).toHaveBeenCalledWith('user-1', dto, file);
  });

  it('getDocuments should delegate to the service with the userId from @CurrentUser', async () => {
    await controller.getDocuments('user-1');
    expect(mockUserKycService.getDocuments).toHaveBeenCalledWith('user-1');
  });

  it('getDocumentFile should resolve the path via the service and stream it with res.sendFile', async () => {
    mockUserKycService.getDocumentFilePath.mockResolvedValue('/abs/path/file.jpg');
    const res = { sendFile: jest.fn() } as unknown as import('express').Response;

    await controller.getDocumentFile('doc-1', 'user-1', res);

    expect(mockUserKycService.getDocumentFilePath).toHaveBeenCalledWith('user-1', 'doc-1');
    expect(res.sendFile).toHaveBeenCalledWith('/abs/path/file.jpg');
  });
});
