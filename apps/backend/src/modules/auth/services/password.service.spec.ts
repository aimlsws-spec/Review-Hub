import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { PasswordService } from './password.service';

jest.mock('bcrypt');

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  describe('hash', () => {
    it('should hash a password with 12 salt rounds', async () => {
      const password = 'TestPass@123';
      const hashed = 'hashed_password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashed);

      const result = await service.hash(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashed);
    });
  });

  describe('verify', () => {
    it('should return true for matching passwords', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verify('password', 'hash');

      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.verify('password', 'hash');

      expect(result).toBe(false);
    });
  });

  describe('validateStrength', () => {
    it('should reject passwords shorter than 10 characters', () => {
      const result = service.validateStrength('short1!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least 10 characters');
    });

    it('should reject passwords longer than 72 characters', () => {
      const long = 'A1!' + 'a'.repeat(70);
      const result = service.validateStrength(long);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at most 72');
    });

    it('should reject passwords without uppercase', () => {
      const result = service.validateStrength('alllowercase1!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('uppercase');
    });

    it('should reject passwords without lowercase', () => {
      const result = service.validateStrength('ALLUPPERCASE1!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('lowercase');
    });

    it('should reject passwords without number', () => {
      const result = service.validateStrength('NoDigits!!!!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('number');
    });

    it('should reject passwords without special character', () => {
      const result = service.validateStrength('NoSymbol1234');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('special');
    });

    it('should accept valid passwords', () => {
      const result = service.validateStrength('Strong@123');
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });
  });
});
