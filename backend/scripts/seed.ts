/**
 * Development-only seed script. Populates a MongoDB database with a
 * representative workspace so the API and Socket.IO events can be
 * exercised end-to-end without manually creating data through the API.
 *
 * NEVER run this against a production database - it wipes the seeded
 * collections first. Credentials printed below are for local development
 * only and must never be reused anywhere else.
 *
 * Usage: npm run seed
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { logger } from '../src/config/logger';
import { UserModel } from '../src/models/User';
import { WorkspaceModel } from '../src/models/Workspace';
import { WorkspaceMemberModel } from '../src/models/WorkspaceMember';
import { ProjectModel } from '../src/models/Project';
import { TaskModel } from '../src/models/Task';
import { MeetingModel } from '../src/models/Meeting';
import { DecisionModel } from '../src/models/Decision';
import { DocumentModel } from '../src/models/Document';
import { NotificationModel } from '../src/models/Notification';
import { ActivityModel } from '../src/models/Activity';
import { hashPassword } from '../src/utils/password';
import { WorkspaceRole, ProjectStatus, Priority, TaskStatus, MeetingStatus, DecisionStatus, NotificationType, ActivityType, DocumentVisibility } from '../src/constants/enums';

const SEED_PASSWORD = 'DevPassword123';

async function seed() {
  if (env.isProduction) {
    throw new Error('Refusing to run the seed script with NODE_ENV=production');
  }

  await mongoose.connect(env.mongoUri);
  logger.info('Connected to MongoDB for seeding');

  await Promise.all([
    UserModel.deleteMany({ email: /@flowdesk\.dev$/ }),
  ]);

  const passwordHash = await hashPassword(SEED_PASSWORD);

  const [admin, manager, member] = await UserModel.create([
    { name: 'Ava Admin', email: 'admin@flowdesk.dev', passwordHash },
    { name: 'Max Manager', email: 'manager@flowdesk.dev', passwordHash },
    { name: 'Mia Member', email: 'member@flowdesk.dev', passwordHash },
  ]);

  await WorkspaceModel.deleteOne({ slug: 'acme-seed' });
  const workspace = await WorkspaceModel.create({
    name: 'Acme (Seed)',
    slug: 'acme-seed',
    description: 'Seeded development workspace',
    ownerId: admin._id,
  });

  await WorkspaceMemberModel.create([
    { workspaceId: workspace._id, userId: admin._id, role: WorkspaceRole.ADMIN },
    { workspaceId: workspace._id, userId: manager._id, role: WorkspaceRole.MANAGER },
    { workspaceId: workspace._id, userId: member._id, role: WorkspaceRole.MEMBER },
  ]);

  const project = await ProjectModel.create({
    workspaceId: workspace._id,
    name: 'Website Relaunch',
    key: 'WEB',
    description: 'Relaunch the marketing website',
    status: ProjectStatus.ACTIVE,
    priority: Priority.HIGH,
    ownerId: manager._id,
    startDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    members: [admin._id, manager._id, member._id],
  });

  const [taskDone, taskInProgress] = await TaskModel.create([
    {
      workspaceId: workspace._id,
      projectId: project._id,
      title: 'Set up design system',
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      assigneeId: member._id,
      createdBy: manager._id,
      completedAt: new Date(),
    },
    {
      workspaceId: workspace._id,
      projectId: project._id,
      title: 'Build homepage hero section',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      assigneeId: member._id,
      createdBy: manager._id,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
    {
      workspaceId: workspace._id,
      projectId: project._id,
      title: 'Integrate CMS content API',
      status: TaskStatus.BLOCKED,
      priority: Priority.URGENT,
      assigneeId: manager._id,
      createdBy: admin._id,
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ]);

  const meeting = await MeetingModel.create({
    workspaceId: workspace._id,
    projectId: project._id,
    title: 'Sprint Planning',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: MeetingStatus.SCHEDULED,
    organizerId: manager._id,
    participants: [admin._id, manager._id, member._id],
  });

  await DecisionModel.create({
    workspaceId: workspace._id,
    projectId: project._id,
    title: 'Use Next.js for the marketing site',
    decision: 'Adopt Next.js (App Router) for the relaunch.',
    reason: 'Best balance of SEO, DX, and our existing React expertise.',
    alternatives: 'Considered Astro and plain Vite+React.',
    impact: 'Marketing site build pipeline moves to Next.js tooling.',
    status: DecisionStatus.ACTIVE,
    createdBy: manager._id,
    meetingId: meeting._id,
    relatedTaskIds: [taskInProgress._id],
    tags: ['frontend', 'architecture'],
  });

  await DocumentModel.create({
    workspaceId: workspace._id,
    projectId: project._id,
    title: 'Onboarding Guide',
    slug: 'onboarding-guide-seed',
    content: 'Welcome to the Website Relaunch project. Start here...',
    authorId: admin._id,
    visibility: DocumentVisibility.WORKSPACE,
    tags: ['onboarding'],
  });

  await NotificationModel.create({
    workspaceId: workspace._id,
    userId: member._id,
    type: NotificationType.TASK_ASSIGNED,
    title: 'New task assigned',
    message: 'You were assigned to "Build homepage hero section"',
    entityType: 'Task',
    entityId: taskInProgress._id,
  });

  await ActivityModel.create({
    workspaceId: workspace._id,
    projectId: project._id,
    actorId: manager._id,
    type: ActivityType.TASK_COMPLETED,
    entityType: 'Task',
    entityId: taskDone._id,
    metadata: { title: taskDone.title },
  });

  logger.info('Seed complete');
  logger.info('--- Development-only credentials (never use in production) ---');
  logger.info(`Admin:   admin@flowdesk.dev / ${SEED_PASSWORD}`);
  logger.info(`Manager: manager@flowdesk.dev / ${SEED_PASSWORD}`);
  logger.info(`Member:  member@flowdesk.dev / ${SEED_PASSWORD}`);
  logger.info(`Workspace slug: ${workspace.slug}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  logger.error({ err }, 'Seed script failed');
  process.exit(1);
});
