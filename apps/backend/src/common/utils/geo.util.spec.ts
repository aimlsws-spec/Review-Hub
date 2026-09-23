import { haversineDistanceMeters } from './geo.util';

describe('haversineDistanceMeters', () => {
  it('is zero for the same point', () => {
    expect(haversineDistanceMeters({ latitude: 12.9716, longitude: 77.5946 }, { latitude: 12.9716, longitude: 77.5946 })).toBe(0);
  });

  it('matches a known distance — Bangalore to Chennai is about 290 km', () => {
    const bangalore = { latitude: 12.9716, longitude: 77.5946 };
    const chennai = { latitude: 13.0827, longitude: 80.2707 };

    const distance = haversineDistanceMeters(bangalore, chennai);

    expect(distance).toBeGreaterThan(280_000);
    expect(distance).toBeLessThan(300_000);
  });

  it('is symmetric', () => {
    const a = { latitude: 19.076, longitude: 72.8777 };
    const b = { latitude: 28.7041, longitude: 77.1025 };

    expect(haversineDistanceMeters(a, b)).toBeCloseTo(haversineDistanceMeters(b, a), 6);
  });

  it('gives a small distance for two nearby points, for check-in-radius accuracy', () => {
    // Roughly 111 meters of latitude per 0.001 degree.
    const a = { latitude: 12.9716, longitude: 77.5946 };
    const b = { latitude: 12.9726, longitude: 77.5946 };

    const distance = haversineDistanceMeters(a, b);

    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(120);
  });
});
