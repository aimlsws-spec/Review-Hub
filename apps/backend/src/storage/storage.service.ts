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
      path.join(this.basePath, 'campaign'),
      path.join(this.basePath, 'task-proof'),
      path.join(this.basePath, 'submissions'),
      path.join(this.basePath, 'cms'),
    ];
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  async saveFile(
    buffer: Buffer,
    originalName: string,
    folder = 'uploads',
  ): Promise<UploadResult> {
    const safeFolder = folder.replace(/^\/+|\/+$/g, '');
    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    const relativePath = `/${safeFolder}/${filename}`;
    const fullPath = path.join(this.basePath, safeFolder, filename);

    const dir = path.dirname(fullPath);
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }

    await fs.writeFile(fullPath, buffer);
    this.logger.log(`Saved: ${relativePath}`);

    return {
      path: relativePath,
      size: buffer.length,
      mimeType: this.getMimeType(ext),
      originalName,
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath.replace(/^\//, ''));
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
    return path.join(this.basePath, filePath.replace(/^\//, ''));
  }

  async fileExists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, filePath.replace(/^\//, ''));
    try {
      await fs.access(fullPath);
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
