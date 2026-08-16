import { Types } from 'mongoose';
import { taskCommentRepository } from '../repositories/taskComment.repository';
import { taskRepository } from '../repositories/task.repository';
import { userRepository } from '../repositories/user.repository';
import { workspaceMemberRepository } from '../repositories/workspaceMember.repository';
import { ApiError } from '../utils/ApiError';
import { ActivityType, NotificationType } from '../constants/enums';
import { recordActivity } from './activity.service';
import { notifyUsers } from './notification.service';
import { emitToWorkspace, SocketEvent } from '../sockets/emitter';
import { normalizePagination, PaginationQuery } from '../utils/pagination';
import { buildPagination } from '../utils/ApiResponse';

const MENTION_EMAIL_REGEX = /@([\w.+-]+@[\w-]+\.[\w.-]+)/g;

/** Extracts @email mentions from comment text and resolves them to workspace member user ids. */
async function resolveMentions(content: string, workspaceId: string): Promise<string[]> {
  const emails = Array.from(content.matchAll(MENTION_EMAIL_REGEX)).map((m) => m[1].toLowerCase());
  if (emails.length === 0) return [];

  const users = await Promise.all(emails.map((email) => userRepository.findByEmail(email)));
  const candidateIds = users.filter((u): u is NonNullable<typeof u> => !!u).map((u) => u._id.toString());
  if (candidateIds.length === 0) return [];

  const memberships = await Promise.all(candidateIds.map((id) => workspaceMemberRepository.isMember(workspaceId, id)));
  return candidateIds.filter((_, idx) => memberships[idx]);
}

async function assertTaskInWorkspace(taskId: string, workspaceId: string) {
  const task = await taskRepository.findByIdInWorkspace(taskId, workspaceId);
  if (!task) throw ApiError.notFound('Task not found');
  return task;
}

export async function createComment(taskId: string, workspaceId: string, authorId: string, content: string) {
  const task = await assertTaskInWorkspace(taskId, workspaceId);
  const mentions = await resolveMentions(content, workspaceId);

  const comment = await taskCommentRepository.create({ workspaceId, taskId, authorId, content, mentions });

  await recordActivity({
    workspaceId,
    projectId: task.projectId.toString(),
    actorId: authorId,
    type: ActivityType.COMMENT_ADDED,
    entityType: 'TaskComment',
    entityId: comment._id.toString(),
    metadata: { taskId },
  });

  emitToWorkspace(workspaceId, SocketEvent.COMMENT_CREATED, comment);

  const notifyIds = mentions.filter((id) => id !== authorId);
  if (notifyIds.length > 0) {
    await notifyUsers(notifyIds, {
      workspaceId,
      type: NotificationType.MENTION,
      title: 'You were mentioned in a comment',
      message: `Mentioned in a comment on "${task.title}"`,
      entityType: 'TaskComment',
      entityId: comment._id.toString(),
    });
  }

  if (task.assigneeId && task.assigneeId.toString() !== authorId && !notifyIds.includes(task.assigneeId.toString())) {
    await notifyUsers([task.assigneeId.toString()], {
      workspaceId,
      type: NotificationType.COMMENT,
      title: 'New comment on your task',
      message: `New comment on "${task.title}"`,
      entityType: 'TaskComment',
      entityId: comment._id.toString(),
    });
  }

  return comment;
}

export async function listComments(taskId: string, workspaceId: string, query: PaginationQuery) {
  await assertTaskInWorkspace(taskId, workspaceId);
  const { page, limit, skip } = normalizePagination(query);
  const { items, total } = await taskCommentRepository.listByTask(taskId, skip, limit);
  return { items, pagination: buildPagination(page, limit, total) };
}

export async function updateComment(commentId: string, workspaceId: string, authorId: string, content: string) {
  const comment = await taskCommentRepository.findOne({ _id: commentId, workspaceId });
  if (!comment) throw ApiError.notFound('Comment not found');
  if (comment.authorId.toString() !== authorId) throw ApiError.forbidden('You can only edit your own comments');

  comment.content = content;
  comment.mentions = (await resolveMentions(content, workspaceId)) as unknown as Types.ObjectId[];
  comment.editedAt = new Date();
  await comment.save();
  return comment;
}

export async function deleteComment(commentId: string, workspaceId: string, actorId: string, isPrivileged: boolean) {
  const comment = await taskCommentRepository.findOne({ _id: commentId, workspaceId });
  if (!comment) throw ApiError.notFound('Comment not found');
  if (comment.authorId.toString() !== actorId && !isPrivileged) {
    throw ApiError.forbidden('You can only delete your own comments');
  }

  await taskCommentRepository.deleteById(comment._id.toString());

  await recordActivity({
    workspaceId,
    actorId,
    type: ActivityType.COMMENT_DELETED,
    entityType: 'TaskComment',
    entityId: comment._id.toString(),
    metadata: { taskId: comment.taskId.toString() },
  });
}
