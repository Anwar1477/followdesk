import request from 'supertest';
import { app, registerUser, createWorkspaceFor } from './helpers';

describe('Decision Memory', () => {
  it('creates a decision and supersedes it, preserving history', async () => {
    const admin = await registerUser('DecAdmin');
    const workspace = await createWorkspaceFor(admin);

    const createRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/decisions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ title: 'Use MongoDB', decision: 'We will use MongoDB as the primary datastore.', tags: ['db'] })
      .expect(201);

    const original = createRes.body.data;
    expect(original.status).toBe('ACTIVE');

    const supersedeRes = await request(app)
      .post(`/api/decisions/${original._id}/supersede`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ title: 'Use PostgreSQL', decision: 'We switched to PostgreSQL for stronger relational guarantees.' })
      .expect(201);

    expect(supersedeRes.body.data.previous.status).toBe('SUPERSEDED');
    expect(supersedeRes.body.data.next.supersedes).toBe(original._id);

    const previousRes = await request(app)
      .get(`/api/decisions/${original._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(previousRes.body.data.status).toBe('SUPERSEDED');
    expect(previousRes.body.data.supersededBy).toBe(supersedeRes.body.data.next._id);
  });

  it('denies decision creation to a MEMBER role by default', async () => {
    const admin = await registerUser('DecAdmin2');
    const memberUser = await registerUser('DecMember2');
    const workspace = await createWorkspaceFor(admin);

    await request(app)
      .post(`/api/workspaces/${workspace._id}/members`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: memberUser.email, role: 'MEMBER' })
      .expect(201);

    await request(app)
      .post(`/api/workspaces/${workspace._id}/decisions`)
      .set('Authorization', `Bearer ${memberUser.accessToken}`)
      .send({ title: 'Member decision', decision: 'Should not be allowed' })
      .expect(403);
  });
});
