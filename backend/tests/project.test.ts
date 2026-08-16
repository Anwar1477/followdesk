import request from 'supertest';
import { app, registerUser, createWorkspaceFor } from './helpers';

async function createProject(token: string, workspaceId: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post(`/api/workspaces/${workspaceId}/projects`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Project', key: 'TST', ...overrides })
    .expect(201);
  return res.body.data;
}

describe('Project CRUD', () => {
  it('creates, lists, updates, and deletes a project', async () => {
    const admin = await registerUser('ProjAdmin');
    const workspace = await createWorkspaceFor(admin);

    const project = await createProject(admin.accessToken, workspace._id);
    expect(project.key).toBe('TST');
    expect(project.status).toBe('PLANNING');

    const listRes = await request(app)
      .get(`/api/workspaces/${workspace._id}/projects`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.pagination.total).toBe(1);

    const updateRes = await request(app)
      .patch(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(updateRes.body.data.status).toBe('ACTIVE');

    await request(app)
      .delete(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    await request(app)
      .get(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(404);
  });

  it('returns project health metrics', async () => {
    const admin = await registerUser('HealthAdmin');
    const workspace = await createWorkspaceFor(admin);
    const project = await createProject(admin.accessToken, workspace._id, { key: 'HLT' });

    const res = await request(app)
      .get(`/api/projects/${project._id}/health`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.data.health).toBe('HEALTHY');
    expect(typeof res.body.data.score).toBe('number');
    expect(Array.isArray(res.body.data.reasons)).toBe(true);
  });
});
