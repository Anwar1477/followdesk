import { meetingNoteRepository } from '../repositories/meetingNote.repository';
import { meetingRepository } from '../repositories/meeting.repository';
import { taskRepository } from '../repositories/task.repository';
import { projectRepository } from '../repositories/project.repository';
import { ApiError } from '../utils/ApiError';
import { ActivityType, NotificationType } from '../constants/enums';
import { recordActivity } from './activity.service';
import { createNotification } from './notification.service';
import { emitToWorkspace, SocketEvent } from '../sockets/emitter';
import { IActionItem } from '../models/MeetingNote';

async function assertMeetingInWorkspace(meetingId: string, workspaceId: string) {
  const meeting = await meetingRepository.findByIdInWorkspace(meetingId, workspaceId);
  if (!meeting) throw ApiError.notFound('Meeting not found');
  return meeting;
}

export interface ActionItemInput {
  title: string;
  assigneeId?: string;
  dueDate?: Date;
}

export async function createMeetingNote(
  meetingId: string,
  workspaceId: string,
  authorId: string,
  data: { content: string; actionItems?: ActionItemInput[] }
) {
  await assertMeetingInWorkspace(meetingId, workspaceId);

  const note = await meetingNoteRepository.create({
    workspaceId,
    meetingId,
    authorId,
    content: data.content,
    actionItems: data.actionItems ?? [],
  });

  return note;
}

export async function listMeetingNotes(meetingId: string, workspaceId: string) {
  await assertMeetingInWorkspace(meetingId, workspaceId);
  return meetingNoteRepository.listByMeeting(meetingId);
}

export async function getMeetingNote(noteId: string, workspaceId: string) {
  const note = await meetingNoteRepository.findByIdInWorkspace(noteId, workspaceId);
  if (!note) throw ApiError.notFound('Meeting note not found');
  return note;
}

export async function updateMeetingNote(noteId: string, workspaceId: string, content: string) {
  const note = await getMeetingNote(noteId, workspaceId);
  note.content = content;
  await note.save();
  return note;
}

export async function deleteMeetingNote(noteId: string, workspaceId: string) {
  const note = await getMeetingNote(noteId, workspaceId);
  await meetingNoteRepository.deleteById(note._id.toString());
}

export async function addActionItem(noteId: string, workspaceId: string, input: ActionItemInput) {
  const note = await getMeetingNote(noteId, workspaceId);
  note.actionItems.push({
    title: input.title,
    assigneeId: input.assigneeId as unknown as IActionItem['assigneeId'],
    dueDate: input.dueDate,
    completed: false,
  } as IActionItem);
  await note.save();
  return note;
}

export interface UpdateActionItemInput {
  title?: string;
  assigneeId?: string | null;
  dueDate?: Date | null;
  completed?: boolean;
}

function findActionItem(note: Awaited<ReturnType<typeof getMeetingNote>>, itemId: string) {
  const item = note.actionItems.find((i) => i._id.toString() === itemId);
  if (!item) throw ApiError.notFound('Action item not found');
  return item;
}

export async function updateActionItem(noteId: string, workspaceId: string, itemId: string, data: UpdateActionItemInput) {
  const note = await getMeetingNote(noteId, workspaceId);
  const item = findActionItem(note, itemId);
  Object.assign(item, data);
  await note.save();
  return note;
}

export async function deleteActionItem(noteId: string, workspaceId: string, itemId: string) {
  const note = await getMeetingNote(noteId, workspaceId);
  note.actionItems = note.actionItems.filter((i) => i._id.toString() !== itemId) as typeof note.actionItems;
  await note.save();
  return note;
}

/**
 * Converts a meeting action item into a real project Task: creates the
 * Task, links it back onto the action item (taskId), records an Activity,
 * notifies the assignee, and broadcasts task.created in real time.
 */
export async function convertActionItemToTask(
  noteId: string,
  workspaceId: string,
  itemId: string,
  actorId: string,
  projectId: string
) {
  const note = await getMeetingNote(noteId, workspaceId);
  const item = findActionItem(note, itemId);

  if (item.taskId) throw ApiError.conflict('This action item has already been converted to a task');

  const project = await projectRepository.findByIdInWorkspace(projectId, workspaceId);
  if (!project) throw ApiError.validation('Project does not belong to this workspace');

  const task = await taskRepository.create({
    workspaceId,
    projectId,
    title: item.title,
    createdBy: actorId,
    assigneeId: item.assigneeId,
    dueDate: item.dueDate,
  });

  item.taskId = task._id;
  await note.save();

  await recordActivity({
    workspaceId,
    projectId,
    actorId,
    type: ActivityType.ACTION_ITEM_CONVERTED,
    entityType: 'Task',
    entityId: task._id.toString(),
    metadata: { meetingNoteId: noteId, actionItemId: itemId },
  });

  emitToWorkspace(workspaceId, SocketEvent.TASK_CREATED, task);

  if (item.assigneeId) {
    await createNotification({
      workspaceId,
      userId: item.assigneeId.toString(),
      type: NotificationType.TASK_ASSIGNED,
      title: 'New task from meeting action item',
      message: `"${task.title}" was created for you from a meeting`,
      entityType: 'Task',
      entityId: task._id.toString(),
    });
  }

  return { note, task };
}
