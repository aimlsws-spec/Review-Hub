import { existsSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  path: string;
  size: number;
  mimeType: string;
  originalName: string;
}

@Injectable()
export class LocalStorageService implements OnModuleInit {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly basePath: string;

  constructor(private readonly config: ConfigService) {
    this.basePath = this.config.get<string>('storage.localPath', './uploads');
  }

  async onModuleInit(): Promise<void> {
    await this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      this.basePath,
      path.join(this.basePath, 'profile'),
      path.join(this.basePath, 'merchant'),
      path.join(this.basePath, 'user'),
      path.join(this.basePath, 'campaign'),
      path.join(this.basePath, 'task-proof'),
      path.join(this.basePath, 'submissions'),
      path.join(this.basePath, 'cms'),
      path.join(this.basePath, 'stories'),
    ];
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Extensions a validated MIME type is allowed to be stored as. Deliberately narrow and
   * deliberately excludes anything a browser would execute (.html, .svg, .js, .xhtml, ...) —
   * see `resolveExtension` for why this matters more than the caller's `allowedMimeTypes` check.
   */
  private static readonly SAFE_EXTENSIONS_BY_MIME: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/csv': '.csv',
    'application/zip': '.zip',
  };

  /**
   * Every file a user uploads (task proof, KYC documents, avatars) must pass `mimeType` — the
   * value the caller already validated against its own allowlist (e.g. SUBMISSION_STORAGE.
   * ALLOWED_MIME_TYPES). The extension actually written to disk comes ONLY from that validated
   * type via SAFE_EXTENSIONS_BY_MIME, never from `originalName`.
   *
   * Why: `mimeType` on a multipart upload is the Content-Type header on that form part — the
   * client sets it, so "it's on the allowlist" alone proves nothing about the file's real
   * content or its original name. Before this, a request could claim `image/png` while naming
   * the file `x.html` and containing a `<script>`; the allowlist check would pass, and this
   * method would still have written it to disk as `<uuid>.html` — a stored-XSS file sitting
   * next to every legitimate upload. Restricting the stored extension to a fixed, non-executable
   * set closes that regardless of what the caller's own MIME check does or doesn't catch.
   *
   * Server-generated files (invoice PDFs, AI story images) have no attacker-supplied MIME type
   * to trust in the first place, so they omit `mimeType` and keep today's originalName-derived
   * extension — safe because the developer, not a request, chose that name.
   */
  async saveFile(
    buffer: Buffer,
    originalName: string,
    folder = 'uploads',
    mimeType?: string,
  ): Promise<UploadResult> {
    const safeFolder = folder.replace(/^\/+|\/+$/g, '');
    const ext = this.resolveExtension(originalName, mimeType);
    const filename = `${uuidv4()}${ext}`;
    const relativePath = `/${safeFolder}/${filename}`;
    const fullPath = this.resolveSafePath(`${safeFolder}/${filename}`);

    const dir = path.dirname(fullPath);
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }

    await fs.writeFile(fullPath, buffer);
    this.logger.log(`Saved: ${relativePath}`);

    return {
      path: relativePath,
      size: buffer.length,
      mimeType: mimeType ?? this.getMimeType(ext),
      originalName,
    };
  }

  private resolveExtension(originalName: string, mimeType?: string): string {
    if (!mimeType) return path.extname(originalName);
    const safeExt = LocalStorageService.SAFE_EXTENSIONS_BY_MIME[mimeType];
    if (!safeExt) throw new Error(`No safe file extension mapped for MIME type "${mimeType}"`);
    return safeExt;
  }

  /**
   * Joins `filePath` under `basePath` and refuses anything that resolves outside it — a `..`
   * segment (however encoded) can never escape the uploads root. Every caller here passes a
   * path this service itself wrote (a DB column populated from `saveFile`'s own return value),
   * so this is defense-in-depth for a path that isn't reachable today, not a fix for a live bug.
   */
  private resolveSafePath(filePath: string): string {
    const resolvedBase = path.resolve(this.basePath);
    const resolved = path.resolve(this.basePath, filePath.replace(/^\/+/, ''));
    if (resolved !== resolvedBase && !resolved.startsWith(resolvedBase + path.sep)) {
      throw new Error(`Refusing to resolve a path outside the uploads root: ${filePath}`);
    }
    return resolved;
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = this.resolveSafePath(filePath);
    try {
      await fs.unlink(fullPath);
      this.logger.log(`Deleted: ${filePath}`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.error(`Failed to delete: ${filePath}`, (err as Error).message);
        throw err;
      }
    }
  }

  getFilePath(filePath: string): string {
    return this.resolveSafePath(filePath);
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(this.resolveSafePath(filePath));
      return true;
    } catch {
      return false;
    }
  }

  private getMimeType(ext: string): string {
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
    };
    return mimeMap[ext.toLowerCase()] ?? 'application/octet-stream';
  }
}
