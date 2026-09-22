import { INestApplication } from '@nestjs/common';

import { PrismaService } from '../src/database/prisma/prisma.service';

import { Api } from './utils/api';
import { createTestApp } from './utils/create-test-app';

/** Date of birth, gender and location: the details campaigns use to find the people they are meant for. */
describe('Profile details and locations (e2e)', () => {
  let app: INestApplication;
  let api: Api;

  type Place = { id: string; name: string };
  let gujarat: Place;
  let maharashtra: Place;
  let ahmedabad: Place;
  let mumbai: Place;

  const stateByName = (states: Place[], name: string) => states.find((s) => s.name === name) as Place;

  beforeAll(async () => {
    app = await createTestApp();
    api = new Api(app);

    const states = (await api.get('/locations/states').expect(200)).body.data as Place[];
    gujarat = stateByName(states, 'Gujarat');
    maharashtra = stateByName(states, 'Maharashtra');
    ahmedabad = ((await api.get(`/locations/states/${gujarat.id}/cities`).expect(200)).body.data as Place[]).find((c) => c.name === 'Ahmedabad') as Place;
    mumbai = ((await api.get(`/locations/states/${maharashtra.id}/cities`).expect(200)).body.data as Place[]).find((c) => c.name === 'Mumbai') as Place;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('locations', () => {
    it('lists every Indian state and union territory without signing in, sorted by name', async () => {
      const res = await api.get('/locations/states').expect(200);

      const names = (res.body.data as Place[]).map((s) => s.name);
      expect(names).toHaveLength(36);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
      expect(names).toEqual(expect.arrayContaining(['Gujarat', 'Maharashtra', 'Delhi', 'Ladakh', 'Puducherry']));
    });

    it('lets the answer be cached for an hour', async () => {
      const res = await api.get('/locations/states').expect(200);

      expect(res.headers['cache-control']).toBe('public, max-age=3600');
    });

    it('lists the cities of a state, and only that state’s', async () => {
      const res = await api.get(`/locations/states/${gujarat.id}/cities`).expect(200);

      const names = (res.body.data as Place[]).map((c) => c.name);
      expect(names).toEqual(expect.arrayContaining(['Ahmedabad', 'Surat', 'Vadodara']));
      expect(names).not.toContain('Mumbai');
    });

    it('says a state does not exist rather than returning an empty list', async () => {
      await api.get('/locations/states/00000000-0000-4000-8000-000000000000/cities').expect(404);
    });

    it('refuses an id that is not a UUID, and a country code that is not two letters', async () => {
      await api.get('/locations/states/not-an-id/cities').expect(400);
      await api.get('/locations/states?countryCode=INDIA').expect(422);
    });

    it('lists the states of another country when asked', async () => {
      const res = await api.get('/locations/states?countryCode=us').expect(200);

      expect((res.body.data as Place[]).map((s) => s.name)).toContain('California');
    });
  });

  describe('saving details on a profile', () => {
    it('a new user has none', async () => {
      const user = await api.registerUser();

      const me = (await api.get('/auth/me', user.token).expect(200)).body.data;

      expect(me).toMatchObject({ dateOfBirth: null, gender: null, countryId: null, stateId: null, cityId: null });
    });

    it('saves them, and one chosen city fixes the state and the country', async () => {
      const user = await api.registerUser();

      const saved = await api
        .patch('/auth/profile', user.token)
        .send({ dateOfBirth: '1998-04-21', gender: 'FEMALE', cityId: ahmedabad.id })
        .expect(200);

      expect(saved.body.data).toMatchObject({ dateOfBirth: '1998-04-21', gender: 'FEMALE', cityId: ahmedabad.id, stateId: gujarat.id });
      expect(saved.body.data.countryId).toEqual(expect.any(String));

      const me = (await api.get('/auth/me', user.token).expect(200)).body.data;
      expect(me).toMatchObject({ dateOfBirth: '1998-04-21', gender: 'FEMALE', cityId: ahmedabad.id, stateId: gujarat.id });
    });

    it('can be given while registering', async () => {
      const id = Date.now();
      const res = await api
        .post('/auth/register')
        .send({
          firstName: 'Priya',
          lastName: 'Shah',
          email: `details-${id}@example.com`,
          phone: `+9196${String(id).slice(-8)}`,
          password: 'Passw0rd!23',
          dateOfBirth: '2000-01-15',
          gender: 'OTHER',
          cityId: mumbai.id,
        })
        .expect(201);

      const me = (await api.get('/auth/me', res.body.data.tokens.accessToken).expect(200)).body.data;
      expect(me).toMatchObject({ dateOfBirth: '2000-01-15', gender: 'OTHER', cityId: mumbai.id, stateId: maharashtra.id });
    });

    it('refuses a bad city while registering and creates no account', async () => {
      const id = Date.now() + 1;
      const email = `refused-${id}@example.com`;

      await api
        .post('/auth/register')
        .send({
          firstName: 'Priya',
          lastName: 'Shah',
          email,
          phone: `+9195${String(id).slice(-8)}`,
          password: 'Passw0rd!23',
          cityId: '00000000-0000-4000-8000-000000000000',
        })
        .expect(400);

      await api.post('/auth/login').send({ email, password: 'Passw0rd!23' }).expect(401);
    });

    it('refuses a city that is not in the chosen state', async () => {
      const user = await api.registerUser();

      const res = await api.patch('/auth/profile', user.token).send({ stateId: maharashtra.id, cityId: ahmedabad.id });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/not in the chosen state/);
      expect((await api.get('/auth/me', user.token).expect(200)).body.data.cityId).toBeNull();
    });

    it('moving to another state drops the old city', async () => {
      const user = await api.registerUser();
      await api.patch('/auth/profile', user.token).send({ cityId: ahmedabad.id }).expect(200);

      const moved = await api.patch('/auth/profile', user.token).send({ stateId: maharashtra.id }).expect(200);

      expect(moved.body.data.stateId).toBe(maharashtra.id);
      expect(moved.body.data.cityId).toBeNull();
    });

    it('choosing the same state again keeps the city', async () => {
      const user = await api.registerUser();
      await api.patch('/auth/profile', user.token).send({ cityId: ahmedabad.id }).expect(200);

      const again = await api.patch('/auth/profile', user.token).send({ stateId: gujarat.id }).expect(200);

      expect(again.body.data.cityId).toBe(ahmedabad.id);
    });

    it('null removes what was saved, and clearing the state clears the city and country too', async () => {
      const user = await api.registerUser();
      await api.patch('/auth/profile', user.token).send({ dateOfBirth: '1998-04-21', gender: 'MALE', cityId: ahmedabad.id }).expect(200);

      const cleared = await api.patch('/auth/profile', user.token).send({ dateOfBirth: null, gender: null, stateId: null }).expect(200);

      expect(cleared.body.data).toMatchObject({ dateOfBirth: null, gender: null, countryId: null, stateId: null, cityId: null });
    });

    it('leaves the details alone when only the name is changed', async () => {
      const user = await api.registerUser();
      await api.patch('/auth/profile', user.token).send({ dateOfBirth: '1998-04-21', cityId: ahmedabad.id }).expect(200);

      const renamed = await api.patch('/auth/profile', user.token).send({ firstName: 'Anita' }).expect(200);

      expect(renamed.body.data).toMatchObject({ firstName: 'Anita', dateOfBirth: '1998-04-21', cityId: ahmedabad.id });
    });

    it.each([
      ['a child', { dateOfBirth: '2020-01-01' }],
      ['a date in the future', { dateOfBirth: '2999-01-01' }],
      ['a date that does not exist', { dateOfBirth: '2001-02-30' }],
      ['ALL as a gender', { gender: 'ALL' }],
      ['a country id sent by the client', { countryId: '00000000-0000-4000-8000-000000000000' }],
    ])('refuses %s', async (_label, body) => {
      const user = await api.registerUser();

      await api.patch('/auth/profile', user.token).send(body).expect(422);
    });

    it('needs sign-in', async () => {
      await api.patch('/auth/profile').send({ gender: 'MALE' }).expect(401);
    });
  });

  describe('what it is used for', () => {
    it('never puts the date of birth or place into the activity log, only that they changed', async () => {
      const user = await api.registerUser();
      await api.patch('/auth/profile', user.token).send({ dateOfBirth: '1997-03-09', cityId: ahmedabad.id }).expect(200);

      // The log entry is written by an event listener just after the response, so wait for it.
      const prisma = app.get(PrismaService);
      let logs = await prisma.activityLog.findMany({ where: { userId: user.id, action: 'PROFILE_UPDATE' } });
      for (let attempt = 0; attempt < 30 && logs.length === 0; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        logs = await prisma.activityLog.findMany({ where: { userId: user.id, action: 'PROFILE_UPDATE' } });
      }

      expect(logs.length).toBeGreaterThan(0);
      const text = JSON.stringify(logs);
      expect(text).not.toContain('1997');
      expect(text).not.toContain(ahmedabad.id);
      expect(text).toContain('dateOfBirth');
    });
  });
});
