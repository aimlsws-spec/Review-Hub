import { AddressInfo, createServer, Server } from 'net';

import { VirusScanService } from './virus-scan.service';

/** A stand-in clamd: reads an INSTREAM upload and answers the way the real daemon does. */
function fakeClamd(answer: (payload: Buffer) => string): Promise<{ server: Server; port: number; received: Buffer[] }> {
  const received: Buffer[] = [];
  const server = createServer((socket) => {
    let data = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      data = Buffer.concat([data, chunk]);
      const command = 'zINSTREAM\0';
      if (data.length < command.length) return;
      // Walk the length-prefixed chunks; a zero length ends the stream.
      let offset = command.length;
      const parts: Buffer[] = [];
      while (offset + 4 <= data.length) {
        const size = data.readUInt32BE(offset);
        if (size === 0) {
          const payload = Buffer.concat(parts);
          received.push(payload);
          socket.end(`${answer(payload)}\0`);
          return;
        }
        if (offset + 4 + size > data.length) return;
        parts.push(data.subarray(offset + 4, offset + 4 + size));
        offset += 4 + size;
      }
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: (server.address() as AddressInfo).port, received })));
}

const configWith = (values: Record<string, unknown>) => ({ get: (key: string, fallback?: unknown) => (key in values ? values[key] : fallback) });

describe('VirusScanService', () => {
  const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
  let clamd: Awaited<ReturnType<typeof fakeClamd>>;

  beforeAll(async () => {
    clamd = await fakeClamd((payload) => (payload.toString().includes('EICAR') ? 'stream: Eicar-Test-Signature FOUND' : 'stream: OK'));
  });

  afterAll(() => new Promise<void>((resolve) => clamd.server.close(() => resolve())));

  const service = (overrides: Record<string, unknown> = {}) =>
    new VirusScanService(configWith({ 'virusScan.enabled': true, 'virusScan.host': '127.0.0.1', 'virusScan.port': clamd.port, 'virusScan.timeoutMs': 2000, ...overrides }) as never);

  it('does nothing while scanning is switched off', async () => {
    await expect(service({ 'virusScan.enabled': false }).scan(Buffer.from(EICAR))).resolves.toEqual({ status: 'skipped' });
  });

  it('reports a clean file as clean, sending every byte in chunks', async () => {
    const big = Buffer.alloc(200 * 1024, 7);
    await expect(service().scan(big)).resolves.toEqual({ status: 'clean' });
    expect(clamd.received.at(-1)?.equals(big)).toBe(true);
  });

  it('reports the signature of an infected file', async () => {
    await expect(service().scan(Buffer.from(EICAR))).resolves.toEqual({ status: 'infected', signature: 'Eicar-Test-Signature' });
  });

  it('reports an error, never "clean", when ClamAV can not be reached', async () => {
    const result = await service({ 'virusScan.port': 1 }).scan(Buffer.from('hello'));
    expect(result.status).toBe('error');
  });

  it('treats an unexpected reply as an error', () => {
    expect(VirusScanService.parseReply('INSTREAM size limit exceeded. ERROR\0')).toMatchObject({ status: 'error' });
    expect(VirusScanService.parseReply('stream: OK\0')).toEqual({ status: 'clean' });
  });
});
