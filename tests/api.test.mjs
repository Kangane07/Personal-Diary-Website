import { describe, it, expect } from 'vitest';
import request from 'supertest';

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';

const serverModule = await import('../server.js');
const { app } = serverModule;

let token;
let entryId;

describe('API smoke flow', () => {
  it('registers', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Tester'
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    token = res.body.token;

    const verify = await request(app).post('/api/auth/verify-email').send({ token: res.body.verificationToken });
    expect(verify.status).toBe(200);
  });

  it('creates entry', async () => {
    const res = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hello', text: 'World entry', draft: true });

    expect(res.status).toBe(201);
    entryId = res.body.id;
  });

  it('finalizes entry', async () => {
    const res = await request(app)
      .patch(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ draft: false });

    expect(res.status).toBe(200);
    expect(res.body.draft).toBe(false);
  });

  it('lists entries', async () => {
    const res = await request(app)
      .get('/api/entries')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  it('deletes entry', async () => {
    const res = await request(app)
      .delete(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
  });
});
