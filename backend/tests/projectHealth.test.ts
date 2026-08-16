import { calculateProjectHealth } from '../src/services/projectHealth.service';
import { registerUser, createWorkspaceFor, app } from './helpers';
import request from 'supertest';

describe('Project health calculation (deterministic)', () => {
  it('scores a project with no tasks as HEALTHY', async () => {
    const admin = await registerUser('HealthUnitAdmin');
    const workspace = await createWorkspaceFor(admin);

    const projectRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/projects`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Empty Project', key: 'EMP' })
      .expect(201);

    const result = await calculateProjectHealth(projectRes.body.data._id, workspace._id);
    expect(result.health).toBe('HEALTHY');
    expect(result.score).toBe(100);
  });

  it('degrades health as overdue and blocked tasks accumulate', async () => {
    const admin = await registerUser('HealthUnitAdmin2');
    const workspace = await createWorkspaceFor(admin);

    const projectRes = await request(app)
      .post(`/api/workspaces/${workspace._id}/projects`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'At Risk Project', key: 'RSK' })
      .expect(201);
    const projectId = projectRes.body.data._id;

    const pastDue = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    for (let i = 0; i < 4; i += 1) {
      await request(app)
        .post(`/api/workspaces/${workspace._id}/tasks`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ projectId, title: `Overdue task ${i}`, dueDate: pastDue })
        .expect(201);
    }

    const result = await calculateProjectHealth(projectId, workspace._id);
    expect(result.metrics.overdueTasks).toBe(4);
    expect(result.score).toBeLessThan(100);
    expect(result.health).not.toBe('HEALTHY');
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
