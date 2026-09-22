import { CidrSet, isPrivateIp, parseCidr, parseIp } from './cidr.util';

describe('parseIp', () => {
  it('reads IPv4', () => {
    expect(parseIp('1.2.3.4')).toEqual({ family: 4, value: 0x01020304n });
    expect(parseIp('  255.255.255.255 ')).toEqual({ family: 4, value: 0xffffffffn });
    expect(parseIp('0.0.0.0')).toEqual({ family: 4, value: 0n });
  });

  it.each(['256.1.1.1', '1.2.3', '1.2.3.4.5', '1.2.3.x', 'a.b.c.d', '', '   ', '1.2.3.-4', '1..3.4'])(
    'rejects the invalid IPv4 %j',
    (input) => expect(parseIp(input)).toBeNull(),
  );

  it('reads IPv6, including the :: shorthand', () => {
    expect(parseIp('::1')).toEqual({ family: 6, value: 1n });
    expect(parseIp('::')).toEqual({ family: 6, value: 0n });
    expect(parseIp('2001:db8::1')).toEqual({ family: 6, value: 0x20010db8000000000000000000000001n });
    expect(parseIp('2001:0db8:0000:0000:0000:0000:0000:0001')).toEqual(parseIp('2001:db8::1'));
    expect(parseIp('FE80::ABCD')).toEqual(parseIp('fe80::abcd'));
  });

  it('reads a bracketed IPv6 address and ignores a zone id', () => {
    expect(parseIp('[2001:db8::1]')).toEqual(parseIp('2001:db8::1'));
    expect(parseIp('fe80::1%eth0')).toEqual(parseIp('fe80::1'));
  });

  it('treats an IPv4 address written in IPv6 form as IPv4, since that is how a dual-stack server reports one', () => {
    expect(parseIp('::ffff:1.2.3.4')).toEqual({ family: 4, value: 0x01020304n });
    expect(parseIp('::ffff:0102:0304')).toEqual({ family: 4, value: 0x01020304n });
  });

  it('reads an IPv6 address with an IPv4 tail', () => {
    expect(parseIp('64:ff9b::192.0.2.1')).toEqual({ family: 6, value: 0x0064ff9b0000000000000000c0000201n });
  });

  it.each(['2001:db8::1::2', '2001:db8', 'gggg::1', '1:2:3:4:5:6:7:8:9', '1:2:3:4:5:6:7::8', '::1.2.3', ':::'])(
    'rejects the invalid IPv6 %j',
    (input) => expect(parseIp(input)).toBeNull(),
  );
});

describe('parseCidr', () => {
  it('gives the first and last address of an IPv4 range', () => {
    const range = parseCidr('192.168.1.77/24');
    expect(range).toEqual({ family: 4, start: 0xc0a80100n, end: 0xc0a801ffn });
  });

  it('treats a single address as a range of one', () => {
    expect(parseCidr('8.8.8.8')).toEqual({ family: 4, start: 0x08080808n, end: 0x08080808n });
    expect(parseCidr('8.8.8.8/32')).toEqual(parseCidr('8.8.8.8'));
  });

  it('covers everything for /0 and one address for the full prefix', () => {
    expect(parseCidr('0.0.0.0/0')).toEqual({ family: 4, start: 0n, end: 0xffffffffn });
    expect(parseCidr('2001:db8::1/128')).toEqual({ family: 6, start: parseIp('2001:db8::1')?.value, end: parseIp('2001:db8::1')?.value });
  });

  it('handles IPv6 ranges', () => {
    const range = parseCidr('2001:db8::/32');
    expect(range?.family).toBe(6);
    expect(range?.start).toBe(0x20010db8000000000000000000000000n);
    expect(range?.end).toBe(0x20010db8ffffffffffffffffffffffffn);
  });

  it.each(['1.2.3.4/33', '1.2.3.4/-1', '1.2.3.4/abc', '1.2.3.4/', 'nonsense/8', '2001:db8::/129', '/24', ''])(
    'rejects %j',
    (input) => expect(parseCidr(input)).toBeNull(),
  );
});

describe('CidrSet', () => {
  it('finds addresses inside a range, and only those', () => {
    const set = CidrSet.fromEntries(['10.1.0.0/16']);

    expect(set.contains('10.1.0.0')).toBe(true);
    expect(set.contains('10.1.255.255')).toBe(true);
    expect(set.contains('10.1.7.7')).toBe(true);
    expect(set.contains('10.0.255.255')).toBe(false);
    expect(set.contains('10.2.0.0')).toBe(false);
  });

  it('keeps IPv4 and IPv6 apart', () => {
    const set = CidrSet.fromEntries(['1.2.3.0/24', '2001:db8::/32']);

    expect(set.contains('1.2.3.9')).toBe(true);
    expect(set.contains('2001:db8::9')).toBe(true);
    expect(set.contains('2001:db9::1')).toBe(false);
    expect(set.contains('::ffff:1.2.3.9')).toBe(true); // IPv4 in IPv6 clothing
  });

  it('answers correctly across many unsorted, overlapping ranges', () => {
    const set = CidrSet.fromEntries(['200.0.0.0/8', '10.0.0.0/8', '10.5.0.0/16', '100.0.0.0/16', '10.0.0.0/8', '150.1.2.3']);

    expect(set.size).toBe(4); // 10/8 (merged with its duplicate and the /16 inside it), 100.0/16, 150.1.2.3, 200/8
    for (const inside of ['10.99.0.1', '10.5.1.1', '100.0.9.9', '150.1.2.3', '200.255.255.255']) expect(set.contains(inside)).toBe(true);
    for (const outside of ['9.255.255.255', '11.0.0.0', '100.1.0.0', '150.1.2.4', '201.0.0.0']) expect(set.contains(outside)).toBe(false);
  });

  it('merges neighbouring ranges into one', () => {
    const set = CidrSet.fromEntries(['1.0.0.0/25', '1.0.0.128/25']);

    expect(set.size).toBe(1);
    expect(set.contains('1.0.0.200')).toBe(true);
  });

  it('is empty and matches nothing when nothing was added', () => {
    const set = new CidrSet();
    set.finish();

    expect(set.size).toBe(0);
    expect(set.contains('1.2.3.4')).toBe(false);
  });

  it('never matches something that is not an address', () => {
    expect(CidrSet.fromEntries(['0.0.0.0/0']).contains('not an ip')).toBe(false);
  });

  describe('fromText', () => {
    it('reads a published list: comments, blank lines, windows line endings and single addresses', () => {
      const set = CidrSet.fromText(['# VPN ranges', '', '1.2.3.0/24   # a provider', '4.4.4.4', '\t5.6.0.0/16\r', '2001:db8::/32'].join('\r\n'));

      expect(set.size).toBe(4);
      expect(set.contains('1.2.3.50')).toBe(true);
      expect(set.contains('4.4.4.4')).toBe(true);
      expect(set.contains('5.6.9.9')).toBe(true);
      expect(set.contains('2001:db8::5')).toBe(true);
    });

    it('skips lines that are not ranges rather than failing the whole list', () => {
      const set = CidrSet.fromText('1.2.3.0/24\nthis is a heading\n999.1.1.1\n5.5.5.0/24');

      expect(set.size).toBe(2);
    });

    it('is empty for an HTML error page, so a bad download is noticed', () => {
      expect(CidrSet.fromText('<html><body>503 Service Unavailable</body></html>').size).toBe(0);
    });
  });

  it('reports whether an entry was accepted', () => {
    const set = new CidrSet();

    expect(set.add('1.2.3.4/24')).toBe(true);
    expect(set.add('garbage')).toBe(false);
  });
});

describe('isPrivateIp', () => {
  it.each(['10.0.0.1', '10.255.255.255', '172.16.0.1', '172.31.255.255', '192.168.1.1', '127.0.0.1', '169.254.1.1', '0.0.0.0', '::1', 'fe80::1', 'fc00::1', 'fd12:3456::1', '::ffff:192.168.0.1'])(
    'treats %s as private',
    (ip) => expect(isPrivateIp(ip)).toBe(true),
  );

  it.each(['8.8.8.8', '172.15.255.255', '172.32.0.0', '192.169.0.1', '100.64.0.1', '2001:db8::1', '::ffff:8.8.8.8'])('treats %s as public', (ip) =>
    expect(isPrivateIp(ip)).toBe(false),
  );

  it('does not treat carrier-grade NAT addresses (100.64/10) as private: mobile users really sit behind them', () => {
    expect(isPrivateIp('100.64.10.10')).toBe(false);
  });
});
