import { LocationCheckinVerificationService } from './location-checkin-verification.service';

describe('LocationCheckinVerificationService', () => {
  let service: LocationCheckinVerificationService;

  const store = { latitude: 12.9716, longitude: 77.5946 };

  beforeEach(() => {
    service = new LocationCheckinVerificationService();
  });

  it('passes when standing at the exact target', () => {
    const verdict = service.verify(store, store);
    expect(verdict.passed).toBe(true);
    expect(verdict.distanceMeters).toBe(0);
  });

  it('passes within the configured radius', () => {
    // ~55m north of the store.
    const verdict = service.verify({ ...store, radiusMeters: 100 }, { latitude: 12.972, longitude: 77.5946 });
    expect(verdict.passed).toBe(true);
  });

  it('fails outside the configured radius, and says how far off', () => {
    const verdict = service.verify({ ...store, radiusMeters: 50 }, { latitude: 13.05, longitude: 77.5946 });
    expect(verdict.passed).toBe(false);
    expect(verdict.reason).toContain('50m');
  });

  it('defaults to a 200m radius when none is configured', () => {
    // ~111m away — inside the 200m default, outside a tighter one.
    const nearby = { latitude: 12.9726, longitude: 77.5946 };
    expect(service.verify(store, nearby).passed).toBe(true);
    expect(service.verify({ ...store, radiusMeters: 50 }, nearby).passed).toBe(false);
  });

  it('fails when no location was submitted', () => {
    const verdict = service.verify(store, null);
    expect(verdict.passed).toBe(false);
    expect(verdict.reason).toMatch(/location is required/i);
  });

  it('fails safe when the task has no configured target', () => {
    expect(service.verify({}, store).passed).toBe(false);
    expect(service.verify(null, store).passed).toBe(false);
  });
});
