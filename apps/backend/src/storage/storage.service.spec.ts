import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { LocalStorageService } from './storage.service';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-service-spec-'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStorageService,
        { provide: ConfigService, useValue: { get: () => tempRoot } },
      ],
    }).compile();

    service = module.get(LocalStorageService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  describe('saveFile — extension comes from the validated MIME type, not the client-supplied filename', () => {
    it('stores a validated image/png upload as .png even if the client named it something else', async () => {
      const result = await service.saveFile(Buffer.from('fake-png-bytes'), 'photo.png', 'profile', 'image/png');
      expect(result.path).toMatch(/\/profile\/[0-9a-f-]+\.png$/);
    });

    it('ignores an attacker-chosen .html filename once a real MIME type is given: it is never stored as .html', async () => {
      // The exact attack this closes: claim Content-Type: image/png on the multipart part (passes
      // the caller's allowedMimeTypes check) while naming the file something a browser will execute.
      const result = await service.saveFile(Buffer.from('<script>alert(1)</script>'), 'evil.html', 'profile', 'image/png');
      expect(result.path).toMatch(/\.png$/);
      expect(result.path).not.toMatch(/\.html$/);
    });

    it('throws for a MIME type with no safe extension mapping, rather than falling back to the filename', async () => {
      await expect(
        service.saveFile(Buffer.from('x'), 'whatever.txt', 'profile', 'text/html'),
      ).rejects.toThrow(/No safe file extension mapped/);
    });

    it('falls back to the filename extension only when no MIME type is given (server-generated files)', async () => {
      const result = await service.saveFile(Buffer.from('%PDF-1.4'), 'invoice-2026.pdf', 'merchant/m1/invoices');
      expect(result.path).toMatch(/\.pdf$/);
    });

    it('actually writes the file under the configured root at the returned path', async () => {
      const result = await service.saveFile(Buffer.from('content'), 'a.png', 'profile', 'image/png');
      const onDisk = await fs.readFile(path.join(tempRoot, result.path));
      expect(onDisk.toString()).toBe('content');
    });
  });

  describe('path safety — deleteFile / getFilePath / fileExists refuse to leave the uploads root', () => {
    it('resolves a normal relative path under the root', () => {
      const resolved = service.getFilePath('/profile/some-file.png');
      expect(resolved).toBe(path.resolve(tempRoot, 'profile', 'some-file.png'));
    });

    it('throws rather than resolving a path-traversal attempt outside the root', () => {
      expect(() => service.getFilePath('../../../../etc/passwd')).toThrow(/outside the uploads root/);
    });

    it('throws for a traversal attempt nested inside an otherwise normal-looking path', () => {
      expect(() => service.getFilePath('/profile/../../secrets.env')).toThrow(/outside the uploads root/);
    });

    it('fileExists returns false for a traversal attempt instead of throwing (so callers using it as a pure existence check still behave)', async () => {
      await expect(service.fileExists('../../../../etc/passwd')).resolves.toBe(false);
    });

    it('deleteFile rejects a traversal attempt rather than touching anything outside the root', async () => {
      await expect(service.deleteFile('../../../../etc/passwd')).rejects.toThrow(/outside the uploads root/);
    });
  });
});
