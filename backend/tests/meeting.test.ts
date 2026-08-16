import request from 'supertest';
import { app, registerUser, createWorkspaceFor } from './helpers';

describe('Meetings, notes, and action-item conversion', () => {
  it('creates a meeting, adds notes with action items, and converts one to a task', async () => {
    const admin = await registerUser('MeetAdmin');
    const workspace = await createWorkspaceFor(admin);

    const projectRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/projects`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Meeting Project', key: 'MTG' })
      .expect(201);

    const meetingRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/meetings`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ title: 'Kickoff', scheduledAt: new Date(Date.now() + 3600_000).toISOString() })
      .expect(201);
    const meeting = meetingRes.body.data;
    expect(meeting.status).toBe('SCHEDULED');

    const noteRes = await request(app)
      .post(`/api/meetings/${meeting._id}/notes`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ content: 'Discussed scope', actionItems: [{ title: 'Draft proposal' }] })
      .expect(201);
    const note = noteRes.body.data;
    expect(note.actionItems).toHaveLength(1);

    const itemId = note.actionItems[0]._id;

    const convertRes = await request(app)
      .post(`/api/meeting-notes/${note._id}/action-items/${itemId}/convert`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ projectId: projectRes.body.data._id })
      .expect(201);

    expect(convertRes.body.data.task.title).toBe('Draft proposal');
    expect(convertRes.body.data.note.actionItems[0].taskId).toBe(convertRes.body.data.task._id);

    // Converting the same action item twice is rejected.
    await request(app)
      .post(`/api/meeting-notes/${note._id}/action-items/${itemId}/convert`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ projectId: projectRes.body.data._id })
      .expect(409);

    await request(app)
      .post(`/api/meetings/${meeting._id}/cancel`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
  });
});
