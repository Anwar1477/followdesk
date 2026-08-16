import request from 'supertest';
import { app, registerUser, createWorkspaceFor } from './helpers';

async function createProject(token: string, workspaceId: string) {
  const res = await request(app)
    .post(`/api/workspaces/${workspaceId}/projects`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Task Project', key: 'TSK' })
    .expect(201);
  return res.body.data;
}

describe('Task CRUD & dependencies', () => {
  it('creates a task, updates status, and completes it', async () => {
    const admin = await registerUser('TaskAdmin');
    const workspace = await createWorkspaceFor(admin);
    const project = await createProject(admin.accessToken, workspace._id);

    const createRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/tasks`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ projectId: project._id, title: 'Do the thing' })
      .expect(201);

    const task = createRes.body.data;
    expect(task.status).toBe('TODO');

    const updateRes = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'DONE' })
      .expect(200);

    expect(updateRes.body.data.status).toBe('DONE');
    expect(updateRes.body.data.completedAt).toBeTruthy();
  });

  it('rejects a self-dependency and a cross-project dependency', async () => {
    const admin = await registerUser('DepAdmin');
    const workspace = await createWorkspaceFor(admin);
    const project = await createProject(admin.accessToken, workspace._id);

    const taskRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/tasks`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ projectId: project._id, title: 'Task A' })
      .expect(201);
    const taskA = taskRes.body.data;

    await request(app)
      .post(`/api/tasks/${taskA._id}/dependencies`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ dependsOnTaskId: taskA._id })
      .expect(422);

    const otherProjectRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/projects`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Other Project', key: 'OTH' })
      .expect(201);

    const taskBRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/tasks`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ projectId: otherProjectRes.body.data._id, title: 'Task B' })
      .expect(201);

    await request(app)
      .post(`/api/tasks/${taskA._id}/dependencies`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ dependsOnTaskId: taskBRes.body.data._id })
      .expect(422);
  });

  it('adds a valid same-project dependency', async () => {
    const admin = await registerUser('DepAdmin2');
    const workspace = await createWorkspaceFor(admin);
    const project = await createProject(admin.accessToken, workspace._id);

    const taskARes = await request(app)
      .post(`/api/workspaces/${workspace._id}/tasks`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ projectId: project._id, title: 'Task A' })
      .expect(201);

    const taskBRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/tasks`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ projectId: project._id, title: 'Task B' })
      .expect(201);

    const depRes = await request(app)
      .post(`/api/tasks/${taskBRes.body.data._id}/dependencies`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ dependsOnTaskId: taskARes.body.data._id })
      .expect(200);

    expect(depRes.body.data.dependsOn).toContain(taskARes.body.data._id);
  });
});
