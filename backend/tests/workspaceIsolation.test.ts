import request from 'supertest';
import { app, registerUser, createWorkspaceFor } from './helpers';

describe('Workspace isolation & RBAC', () => {
  it('prevents a non-member from reading another workspace', async () => {
    const owner = await registerUser('Owner');
    const outsider = await registerUser('Outsider');
    const workspace = await createWorkspaceFor(owner);

    await request(app)
      .get(`/api/workspaces/${workspace._id}`)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .expect(403);
  });

  it('prevents a non-member from creating a project in another workspace', async () => {
    const owner = await registerUser('Owner2');
    const outsider = await registerUser('Outsider2');
    const workspace = await createWorkspaceFor(owner);

    await request(app)
      .post(`/api/workspaces/${workspace._id}/projects`)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .send({ name: 'Sneaky Project', key: 'SNK' })
      .expect(403);
  });

  it('prevents a MEMBER role from creating a project (Admin/Manager only)', async () => {
    const admin = await registerUser('AdminX');
    const memberUser = await registerUser('MemberX');
    const workspace = await createWorkspaceFor(admin);

    await request(app)
      .post(`/api/workspaces/${workspace._id}/members`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: memberUser.email, role: 'MEMBER' })
      .expect(201);

    await request(app)
      .post(`/api/workspaces/${workspace._id}/projects`)
      .set('Authorization', `Bearer ${memberUser.accessToken}`)
      .send({ name: 'Member Project', key: 'MEM' })
      .expect(403);
  });

  it('allows ADMIN to create a project and denies duplicate keys', async () => {
    const admin = await registerUser('AdminY');
    const workspace = await createWorkspaceFor(admin);

    await request(app)
      .post(`/api/workspaces/${workspace._id}/projects`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Core Product', key: 'CORE' })
      .expect(201);

    await request(app)
      .post(`/api/workspaces/${workspace._id}/projects`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Core Product 2', key: 'CORE' })
      .expect(409);
  });

  it('does not allow removing the last admin from a workspace', async () => {
    const admin = await registerUser('AdminZ');
    const workspace = await createWorkspaceFor(admin);

    const membersRes = await request(app)
      .get(`/api/workspaces/${workspace._id}/members`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    const selfUserId = membersRes.body.data[0].userId._id ?? membersRes.body.data[0].userId;

    await request(app)
      .delete(`/api/workspaces/${workspace._id}/members/${selfUserId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(409);
  });
});
