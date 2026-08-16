import request from 'supertest';
import { app, registerUser, createWorkspaceFor } from './helpers';

describe('Documents (knowledge base)', () => {
  it('creates a folder and a document, then edits and deletes the document', async () => {
    const admin = await registerUser('DocAdmin');
    const workspace = await createWorkspaceFor(admin);

    const folderRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/documents/folders`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Engineering' })
      .expect(201);

    const docRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/documents`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ title: 'Onboarding Guide', content: 'Welcome!', folderId: folderRes.body.data._id, tags: ['onboarding'] })
      .expect(201);

    expect(docRes.body.data.slug).toContain('onboarding-guide');

    const updateRes = await request(app)
      .patch(`/api/documents/${docRes.body.data._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ content: 'Welcome, updated!' })
      .expect(200);
    expect(updateRes.body.data.content).toBe('Welcome, updated!');

    // Folder deletion is blocked while it still contains the document.
    await request(app)
      .delete(`/api/document-folders/${folderRes.body.data._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(409);

    await request(app)
      .delete(`/api/documents/${docRes.body.data._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    await request(app)
      .delete(`/api/document-folders/${folderRes.body.data._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
  });
});
