import request from 'supertest';
import { app, registerUser, createWorkspaceFor } from './helpers';

describe('Global search', () => {
  it('finds a project and a task by keyword, scoped to the workspace', async () => {
    const admin = await registerUser('SearchAdmin');
    const outsider = await registerUser('SearchOutsider');
    const workspace = await createWorkspaceFor(admin);

    const projectRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/projects`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Quantum Initiative', key: 'QTM', description: 'A very special project' })
      .expect(201);

    await request(app)
      .post(`/api/workspaces/${workspace._id}/tasks`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ projectId: projectRes.body.data._id, title: 'Quantum entanglement research' })
      .expect(201);

    const res = await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .query({ q: 'Quantum', workspaceId: workspace._id })
      .expect(200);

    const types = res.body.data.map((r: { type: string }) => r.type);
    expect(types).toEqual(expect.arrayContaining(['PROJECT', 'TASK']));

    await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .query({ q: 'Quantum', workspaceId: workspace._id })
      .expect(403);
  });
});
