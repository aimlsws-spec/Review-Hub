import { Socket } from 'net';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ScanResult = { status: 'clean' } | { status: 'infected'; signature: string } | { status: 'skipped' } | { status: 'error'; reason: string };

/** clamd accepts at most StreamMaxLength (25 MB by default) per stream; chunks are sent in pieces well under it. */
const CHUNK_SIZE = 64 * 1024;

/**
 * Scans a file for malware with a ClamAV daemon before it is stored (spec, Volume 4 ch. 4: "every uploaded file →
 * virus scan"). Uploads here are KYC documents, task proof and avatars that admins open on their own machines, so
 * one infected PDF is a way into the admin team.
 *
 * Speaks clamd's INSTREAM command directly over TCP: no extra package, and nothing leaves the server. The
 * protocol: "zINSTREAM\0", then chunks each prefixed with a 4-byte big-endian length, then a zero-length chunk;
 * clamd answers "stream: OK" or "stream: <signature> FOUND".
 */
@Injectable()
export class VirusScanService implements OnModuleInit {
  private readonly logger = new Logger(VirusScanService.name);

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return this.config.get<boolean>('virusScan.enabled', false);
  }

  /** Whether a file that could not be scanned (scanner down) may be stored anyway. Off by default. */
  get failOpen(): boolean {
    return this.config.get<boolean>('virusScan.failOpen', false);
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.warn('Virus scanning is OFF (VIRUS_SCAN_ENABLED is not true) — uploads are stored without a malware scan.');
      return;
    }
    const host = this.config.get<string>('virusScan.host');
    const port = this.config.get<number>('virusScan.port');
    this.logger.log(`Virus scanning is ON — uploads are scanned by ClamAV at ${host}:${port}`);
  }

  async scan(buffer: Buffer): Promise<ScanResult> {
    if (!this.enabled) return { status: 'skipped' };

    const host = this.config.get<string>('virusScan.host', '127.0.0.1');
    const port = this.config.get<number>('virusScan.port', 3310);
    const timeoutMs = this.config.get<number>('virusScan.timeoutMs', 15000);

    try {
      const reply = await this.instream(buffer, host, port, timeoutMs);
      return VirusScanService.parseReply(reply);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`ClamAV scan failed: ${reason}`);
      return { status: 'error', reason };
    }
  }

  /** Turns clamd's one-line reply into a result. Anything unexpected counts as an error, never as clean. */
  static parseReply(reply: string): ScanResult {
    const line = reply.replace(/\0/g, '').trim();
    if (/^stream: OK$/.test(line)) return { status: 'clean' };
    const found = /^stream: (.+) FOUND$/.exec(line);
    if (found) return { status: 'infected', signature: found[1] };
    return { status: 'error', reason: `Unexpected ClamAV reply: ${line.slice(0, 200)}` };
  }

  private instream(buffer: Buffer, host: string, port: number, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      let reply = '';
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (error) reject(error);
        else resolve(reply);
      };

      socket.setTimeout(timeoutMs, () => finish(new Error(`ClamAV did not answer within ${timeoutMs} ms`)));
      socket.on('error', (error) => finish(error));
      socket.on('data', (data) => {
        reply += data.toString('utf8');
        if (reply.includes('\0') || reply.includes('\n')) finish();
      });
      socket.on('end', () => finish());

      socket.connect(port, host, () => {
        socket.write('zINSTREAM\0');
        for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
          const chunk = buffer.subarray(offset, offset + CHUNK_SIZE);
          const size = Buffer.alloc(4);
          size.writeUInt32BE(chunk.length, 0);
          socket.write(size);
          socket.write(chunk);
        }
        socket.write(Buffer.alloc(4)); // zero-length chunk: end of stream
      });
    });
  }
}
