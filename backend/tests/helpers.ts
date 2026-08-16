import request from 'supertest';
import { createApp } from '../src/app';

export const app = createApp();

export interface TestUser {
  accessToken: string;
  userId: string;
  email: string;
}

let counter = 0;

export async function registerUser(name = 'Test User'): Promise<TestUser> {
  counter += 1;
  const email = `user${counter}-${Date.now()}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'Password123' })
    .expect(201);

  return { accessToken: res.body.data.accessToken, userId: res.body.data.user.id, email };
}

export async function createWorkspaceFor(user: TestUser, name = 'Test Workspace') {
  const res = await request(app)
    .post('/api/workspaces')
    .set('Authorization', `Bearer ${user.accessToken}`)
    .send({ name })
    .expect(201);
  return res.body.data;
}
