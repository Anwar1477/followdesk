import request from 'supertest';
import { app, registerUser, createWorkspaceFor } from './helpers';

describe('Notifications', () => {
  it('notifies a user when a task is assigned to them and marks it read', async () => {
    const admin = await registerUser('NotifAdmin');
    const memberUser = await registerUser('NotifMember');
    const workspace = await createWorkspaceFor(admin);

    await request(app)
      .post(`/api/workspaces/${workspace._id}/members`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: memberUser.email, role: 'MEMBER' })
      .expect(201);

    const projectRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/projects`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Notif Project', key: 'NTF' })
      .expect(201);

    await request(app)
      .post(`/api/workspaces/${workspace._id}/tasks`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ projectId: projectRes.body.data._id, title: 'Assigned task', assigneeId: memberUser.userId })
      .expect(201);

    const listRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${memberUser.accessToken}`)
      .expect(200);

    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    const notification = listRes.body.data[0];
    expect(notification.type).toBe('TASK_ASSIGNED');
    expect(notification.read).toBe(false);

    const readRes = await request(app)
      .patch(`/api/notifications/${notification._id}/read`)
      .set('Authorization', `Bearer ${memberUser.accessToken}`)
      .expect(200);
    expect(readRes.body.data.read).toBe(true);
  });
});
