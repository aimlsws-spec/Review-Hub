import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { BroadcastQueryDto, CreateBroadcastDto, CreateNotificationTemplateDto, PreviewAudienceDto, UpdateNotificationTemplateDto } from '../dto';
import { BroadcastService, NotificationTemplateService } from '../services';

import { AdminBroadcastController } from './admin-broadcast.controller';
import { AdminNotificationTemplateController } from './admin-notification-template.controller';

describe('AdminBroadcastController', () => {
  let controller: AdminBroadcastController;
  const mockService = {
    listLocations: jest.fn(),
    previewAudience: jest.fn(),
    create: jest.fn(),
    list: jest.fn(),
    getById: jest.fn(),
    cancel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminBroadcastController],
      providers: [{ provide: BroadcastService, useValue: mockService }],
    }).compile();

    controller = module.get<AdminBroadcastController>(AdminBroadcastController);
    jest.clearAllMocks();
  });

  it('locations delegates to the service', async () => {
    await controller.locations();
    expect(mockService.listLocations).toHaveBeenCalled();
  });

  it('preview passes only the audience filters', async () => {
    const dto = Object.assign(new PreviewAudienceDto(), { audience: { gender: 'FEMALE' } });
    await controller.preview(dto);
    expect(mockService.previewAudience).toHaveBeenCalledWith({ gender: 'FEMALE' });
  });

  it('create passes the acting admin id', async () => {
    const dto = new CreateBroadcastDto();
    await controller.create(dto, 'admin-1');
    expect(mockService.create).toHaveBeenCalledWith(dto, 'admin-1');
  });

  it('list, getOne and cancel delegate to the service', async () => {
    const query = new BroadcastQueryDto();
    await controller.list(query);
    await controller.getOne('b1');
    await controller.cancel('b1', 'admin-1');

    expect(mockService.list).toHaveBeenCalledWith(query);
    expect(mockService.getById).toHaveBeenCalledWith('b1');
    expect(mockService.cancel).toHaveBeenCalledWith('b1', 'admin-1');
  });
});

describe('AdminNotificationTemplateController', () => {
  let controller: AdminNotificationTemplateController;
  const mockService = { list: jest.fn(), getById: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminNotificationTemplateController],
      providers: [{ provide: NotificationTemplateService, useValue: mockService }],
    }).compile();

    controller = module.get<AdminNotificationTemplateController>(AdminNotificationTemplateController);
    jest.clearAllMocks();
  });

  it('delegates every action, passing the acting admin where it matters', async () => {
    const create = new CreateNotificationTemplateDto();
    const update = new UpdateNotificationTemplateDto();

    await controller.list();
    await controller.getOne('t1');
    await controller.create(create, 'admin-1');
    await controller.update('t1', update, 'admin-1');
    await controller.remove('t1', 'admin-1');

    expect(mockService.list).toHaveBeenCalled();
    expect(mockService.getById).toHaveBeenCalledWith('t1');
    expect(mockService.create).toHaveBeenCalledWith(create, 'admin-1');
    expect(mockService.update).toHaveBeenCalledWith('t1', update, 'admin-1');
    expect(mockService.remove).toHaveBeenCalledWith('t1', 'admin-1');
  });
});

describe('broadcast request validation', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = <T>(metatype: new () => T, value: unknown) => pipe.transform(value, { type: 'body', metatype });

  const valid = {
    title: 'Happy hour!',
    message: 'Hi {{firstName}}, tasks are live.',
    channels: ['IN_APP', 'PUSH'],
    audience: {},
  };

  it('accepts a complete request, with an empty audience meaning everyone', async () => {
    await expect(validate(CreateBroadcastDto, valid)).resolves.toMatchObject({ title: 'Happy hour!', channels: ['IN_APP', 'PUSH'] });
  });

  it('trims the title and message', async () => {
    const result = await validate(CreateBroadcastDto, { ...valid, title: '  Hello  ', message: '  Body  ' });
    expect(result).toMatchObject({ title: 'Hello', message: 'Body' });
  });

  it.each([
    ['a missing title', { title: undefined }],
    ['a blank title', { title: '   ' }],
    ['a title over 100 characters', { title: 'x'.repeat(101) }],
    ['a message over 500 characters', { message: 'x'.repeat(501) }],
    ['no channels', { channels: [] }],
    ['a channel we cannot send on (SMS)', { channels: ['SMS'] }],
    ['the same channel twice', { channels: ['PUSH', 'PUSH'] }],
    ['a transactional type reserved for the system', { type: 'REWARD' }],
    ['a schedule that is not a date', { scheduledAt: 'tomorrow-ish' }],
    ['an unknown field', { sendToEveryoneTwice: true }],
    ['a missing audience', { audience: undefined }],
  ])('rejects %s', async (_label, override) => {
    await expect(validate(CreateBroadcastDto, { ...valid, ...override })).rejects.toBeDefined();
  });

  it('accepts the announcement types an admin may use', async () => {
    for (const type of ['PROMOTIONAL', 'SYSTEM', 'CAMPAIGN']) {
      await expect(validate(CreateBroadcastDto, { ...valid, type })).resolves.toBeDefined();
    }
  });

  describe('audience filters', () => {
    const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

    it('accepts a full set of valid filters', async () => {
      const audience = {
        stateIds: [uuid],
        cityIds: [uuid],
        gender: 'FEMALE',
        minAge: 18,
        maxAge: 35,
        minLevel: 2,
        maxLevel: 10,
        kycVerified: true,
        joinedWithinDays: 30,
        inactiveForDays: 14,
      };
      await expect(validate(PreviewAudienceDto, { audience })).resolves.toBeDefined();
    });

    it.each([
      ['gender ALL (no filter is expressed by leaving it out)', { gender: 'ALL' }],
      ['a minimum age under 13', { minAge: 12 }],
      ['a maximum age over 120', { maxAge: 121 }],
      ['a level of 0', { minLevel: 0 }],
      ['zero days', { joinedWithinDays: 0 }],
      ['a location that is not an id', { stateIds: ['Gujarat'] }],
      ['more than 100 locations', { cityIds: Array.from({ length: 101 }, () => '3f2504e0-4f89-41d3-9a0c-0305e82c3301') }],
      ['a KYC flag that is not a boolean', { kycVerified: 'yes' }],
      ['a filter we do not support', { favouriteColour: 'blue' }],
    ])('rejects %s', async (_label, audience) => {
      await expect(validate(PreviewAudienceDto, { audience })).rejects.toBeDefined();
    });
  });

  it('only accepts a known status when listing', async () => {
    await expect(validate(BroadcastQueryDto, { status: 'SENT' })).resolves.toMatchObject({ status: 'SENT' });
    await expect(validate(BroadcastQueryDto, { status: 'MAYBE' })).rejects.toBeDefined();
  });

  describe('templates', () => {
    const template = { name: 'Happy hour', title: 'Happy hour!', body: 'Hi {{firstName}}' };

    it('accepts a valid template and trims its text', async () => {
      await expect(validate(CreateNotificationTemplateDto, { ...template, name: '  Happy hour  ' })).resolves.toMatchObject({ name: 'Happy hour' });
    });

    it.each([
      ['a blank name', { name: ' ' }],
      ['a body over 500 characters', { body: 'x'.repeat(501) }],
      ['an unknown channel', { channel: 'CARRIER_PIGEON' }],
      ['an unknown field', { slug: 'set-it-myself' }],
    ])('rejects %s', async (_label, override) => {
      await expect(validate(CreateNotificationTemplateDto, { ...template, ...override })).rejects.toBeDefined();
    });

    it('lets an update send only some fields, but not blank ones', async () => {
      await expect(validate(UpdateNotificationTemplateDto, { isActive: false })).resolves.toMatchObject({ isActive: false });
      await expect(validate(UpdateNotificationTemplateDto, { title: '  ' })).rejects.toBeDefined();
    });
  });
});
