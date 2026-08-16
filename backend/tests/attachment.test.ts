import request from 'supertest';
import { app, registerUser, createWorkspaceFor } from './helpers';

describe('Attachments', () => {
  it('uploads a file to a task, lists it, and rejects a disallowed MIME type', async () => {
    const admin = await registerUser('AttachAdmin');
    const workspace = await createWorkspaceFor(admin);

    const projectRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/projects`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Attach Project', key: 'ATT' })
      .expect(201);

    const taskRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/tasks`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ projectId: projectRes.body.data._id, title: 'Task with file' })
      .expect(201);

    const uploadRes = await request(app)
      .post(`/api/tasks/${taskRes.body.data._id}/attachments`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .attach('file', Buffer.from('hello world'), { filename: 'notes.txt', contentType: 'text/plain' })
      .expect(201);

    expect(uploadRes.body.data.fileName).toBe('notes.txt');
    expect(uploadRes.body.data.storageDriver).toBe('local');

    const listRes = await request(app)
      .get(`/api/tasks/${taskRes.body.data._id}/attachments`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(listRes.body.data).toHaveLength(1);

    await request(app)
      .post(`/api/tasks/${taskRes.body.data._id}/attachments`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .attach('file', Buffer.from('<script>evil()</script>'), { filename: 'evil.exe', contentType: 'application/x-msdownload' })
      .expect(422);

    await request(app)
      .delete(`/api/attachments/${uploadRes.body.data._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
  });
});
