import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { EmailQueueService } from '../../../mail/email-queue.service';
import { SmsService } from '../../../sms/sms.service';

import { AuthListener } from './auth.listener';

describe('AuthListener', () => {
  let listener: AuthListener;

  const mockEmailQueue = { enqueue: jest.fn() };
  const mockSms = { send: jest.fn() };
  const mockPrisma = {
    user: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
    activityLog: { create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthListener,
        { provide: EmailQueueService, useValue: mockEmailQueue },
        { provide: SmsService, useValue: mockSms },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    listener = module.get<AuthListener>(AuthListener);
    jest.clearAllMocks();
    mockEmailQueue.enqueue.mockResolvedValue(undefined);
    mockSms.send.mockResolvedValue(undefined);
  });

  describe('new device sign-in', () => {
    const event = { userId: 'user-1', ipAddress: '203.0.113.5', deviceName: 'Chrome', os: 'Windows', at: new Date('2026-10-02T08:00:00Z') };

    it('emails the account owner with the device, address and time', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'john@example.com', firstName: 'John' });

      await listener.handleNewDeviceLogin(event);

      const mail = mockEmailQueue.enqueue.mock.calls[0][0];
      expect(mail.to).toBe('john@example.com');
      expect(mail.subject).toBe('New sign-in to your Viralkar account');
      expect(mail.html).toContain('Chrome on Windows');
      expect(mail.html).toContain('203.0.113.5');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorId: 'user-1', entity: 'Device', action: 'LOGIN' }) });
    });

    it('escapes the name it puts in the email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'john@example.com', firstName: '<script>x</script>' });

      await listener.handleNewDeviceLogin(event);

      expect(mockEmailQueue.enqueue.mock.calls[0][0].html).not.toContain('<script>');
    });

    it('still audits when there is no email to alert', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: null, firstName: 'John' });

      await listener.handleNewDeviceLogin(event);

      expect(mockEmailQueue.enqueue).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('phone number changed', () => {
    it('tells the old number and the email, without logging either number', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'john@example.com' });

      await listener.handlePhoneChanged({ userId: 'user-1', oldPhone: '+919876543210', newPhone: '+919811122233' });

      expect(mockSms.send).toHaveBeenCalledWith('+919876543210', expect.stringContaining('****2233'));
      expect(mockEmailQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ to: 'john@example.com', subject: 'Your Viralkar phone number was changed' }));
      const audit = JSON.stringify(mockPrisma.auditLog.create.mock.calls[0][0]);
      expect(audit).not.toContain('9876543210');
      expect(audit).not.toContain('9811122233');
    });

    it('sends no SMS when the account had no phone before', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: null });

      await listener.handlePhoneChanged({ userId: 'user-1', oldPhone: null, newPhone: '+919811122233' });

      expect(mockSms.send).not.toHaveBeenCalled();
    });
  });

  describe('welcome email', () => {
    const welcomed = () =>
      mockEmailQueue.enqueue.mock.calls.filter(([mail]) => String(mail.subject).startsWith('Welcome to Viralkar'));

    it('waits for a password sign-up to verify its email: the first email it gets is the code', async () => {
      await listener.handleUserRegistered({ userId: 'user-1', email: 'new@example.com', phone: null, firstName: 'Asha', emailVerified: false });

      expect(welcomed()).toHaveLength(0);
    });

    it('welcomes once the email is verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'new@example.com', firstName: 'Asha' });

      await listener.handleOtpVerified({ userId: 'user-1', type: 'EMAIL_VERIFICATION' });

      expect(welcomed()).toHaveLength(1);
      expect(welcomed()[0][0]).toMatchObject({ to: 'new@example.com' });
      expect(welcomed()[0][0].html).toContain('Hi Asha,');
    });

    it('welcomes a Google sign-up straight away, since it arrives verified', async () => {
      await listener.handleUserRegistered({ userId: 'user-1', email: 'g@example.com', phone: null, firstName: 'Ravi', emailVerified: true });

      expect(welcomed()).toHaveLength(1);
    });

    it('sends nothing for other kinds of code', async () => {
      await listener.handleOtpVerified({ userId: 'user-1', type: 'PASSWORD_RESET' });

      expect(welcomed()).toHaveLength(0);
    });
  });

  it('confirms an account deletion to the email the account had', async () => {
    await listener.handleAccountDeleted({ userId: 'user-1', email: 'john@example.com' });

    expect(mockEmailQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ to: 'john@example.com', subject: 'Your Viralkar account has been deleted' }));
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ entity: 'User', action: 'DELETE' }) });
  });

  it('audits an acceptance of the policy documents with their versions', async () => {
    const documents = [{ policy: 'TERMS_OF_SERVICE', version: '2026-10-01' }];

    await listener.handlePoliciesAccepted({ userId: 'user-1', ipAddress: '10.0.0.1', documents });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ entity: 'PolicyAcceptance', action: 'CREATE', ipAddress: '10.0.0.1', after: { documents } }),
    });
  });
});
