import { PasswordHistoryService } from './password-history.service';
import { PasswordService } from './password.service';

describe('PasswordHistoryService', () => {
  const repository = { findRecentHashes: jest.fn(), addAndPrune: jest.fn() };
  // Real bcrypt, so the test proves salted hashes are compared by verifying, not by string equality.
  const passwords = new PasswordService();
  let service: PasswordHistoryService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new PasswordHistoryService(repository as never, passwords);
  });

  describe('assertNotRecentlyUsed', () => {
    it('refuses the current password', async () => {
      repository.findRecentHashes.mockResolvedValue([]);
      const current = await passwords.hash('Current@123');

      await expect(service.assertNotRecentlyUsed('user-1', 'Current@123', current)).rejects.toMatchObject({ code: 'PASSWORD_RECENTLY_USED' });
    });

    it('refuses a password from the stored history', async () => {
      repository.findRecentHashes.mockResolvedValue([await passwords.hash('Older@1234'), await passwords.hash('Oldest@123')]);
      const current = await passwords.hash('Current@123');

      await expect(service.assertNotRecentlyUsed('user-1', 'Oldest@123', current)).rejects.toThrow(/last 5 passwords/);
    });

    it('allows a password not in the history, and only looks back as far as the history depth', async () => {
      repository.findRecentHashes.mockResolvedValue([await passwords.hash('Older@1234')]);
      const current = await passwords.hash('Current@123');

      await expect(service.assertNotRecentlyUsed('user-1', 'BrandNew@123', current)).resolves.toBeUndefined();
      // Four previous passwords plus the current one make five.
      expect(repository.findRecentHashes).toHaveBeenCalledWith('user-1', 4);
    });

    it('works for an account that never had a password', async () => {
      repository.findRecentHashes.mockResolvedValue([]);
      await expect(service.assertNotRecentlyUsed('user-1', 'First@1234', null)).resolves.toBeUndefined();
    });
  });

  describe('remember', () => {
    it('stores the replaced hash and keeps four previous passwords', async () => {
      await service.remember('user-1', 'old-hash');
      expect(repository.addAndPrune).toHaveBeenCalledWith('user-1', 'old-hash', 4);
    });

    it('stores nothing when there was no password before', async () => {
      await service.remember('user-1', null);
      expect(repository.addAndPrune).not.toHaveBeenCalled();
    });
  });
});
