import request from 'supertest';
import { app, registerUser } from './helpers';

describe('Auth', () => {
  it('registers a new user and returns an access token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'Password123' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe('alice@example.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects registration with a weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'weak' })
      .expect(422);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate registration emails', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Carl', email: 'carl@example.com', password: 'Password123' }).expect(201);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Carl 2', email: 'carl@example.com', password: 'Password123' })
      .expect(409);

    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('logs in with correct credentials and rejects incorrect ones', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Dana', email: 'dana@example.com', password: 'Password123' }).expect(201);

    await request(app).post('/api/auth/login').send({ email: 'dana@example.com', password: 'WrongPassword1' }).expect(401);

    const res = await request(app).post('/api/auth/login').send({ email: 'dana@example.com', password: 'Password123' }).expect(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('rejects unauthenticated access to /api/auth/me', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });

  it('returns the current user for a valid access token', async () => {
    const user = await registerUser('Erin');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${user.accessToken}`).expect(200);
    expect(res.body.data.email).toBe(user.email);
  });

  it('rejects a malformed/invalid access token', async () => {
    await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token').expect(401);
  });
});
