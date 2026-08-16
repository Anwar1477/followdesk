import { meetingRepository, MeetingListFilter } from '../repositories/meeting.repository';
import { ApiError } from '../utils/ApiError';
import { ActivityType, MeetingStatus, NotificationType } from '../constants/enums';
import { recordActivity } from './activity.service';
import { notifyUsers } from './notification.service';
import { emitToWorkspace, SocketEvent } from '../sockets/emitter';
import { normalizePagination, PaginationQuery } from '../utils/pagination';
import { buildPagination } from '../utils/ApiResponse';

export interface CreateMeetingInput {
  projectId?: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  durationMinutes?: number;
  participants?: string[];
}

export async function createMeeting(workspaceId: string, organizerId: string, data: CreateMeetingInput) {
  const participants = Array.from(new Set([...(data.participants ?? []), organizerId]));

  const meeting = await meetingRepository.create({
    workspaceId,
    projectId: data.projectId,
    title: data.title,
    description: data.description,
    scheduledAt: data.scheduledAt,
    durationMinutes: data.durationMinutes,
    organizerId,
    participants,
  });

  await recordActivity({
    workspaceId,
    projectId: data.projectId,
    actorId: organizerId,
    type: ActivityType.MEETING_CREATED,
    entityType: 'Meeting',
    entityId: meeting._id.toString(),
    metadata: { title: meeting.title },
  });

  const invitees = participants.filter((id) => id !== organizerId);
  if (invitees.length > 0) {
    await notifyUsers(invitees, {
      workspaceId,
      type: NotificationType.MEETING_INVITE,
      title: 'Meeting invitation',
      message: `You've been invited to "${meeting.title}"`,
      entityType: 'Meeting',
      entityId: meeting._id.toString(),
    });
  }

  return meeting;
}

export async function listMeetings(filter: MeetingListFilter, query: PaginationQuery) {
  const { page, limit, skip } = normalizePagination(query);
  const { items, total } = await meetingRepository.list(filter, skip, limit);
  return { items, pagination: buildPagination(page, limit, total) };
}

export async function getMeeting(meetingId: string, workspaceId: string) {
  const meeting = await meetingRepository.findByIdInWorkspace(meetingId, workspaceId);
  if (!meeting) throw ApiError.notFound('Meeting not found');
  return meeting;
}

export interface UpdateMeetingInput {
  title?: string;
  description?: string;
  status?: MeetingStatus;
  scheduledAt?: Date;
  durationMinutes?: number;
}

export async function updateMeeting(meetingId: string, workspaceId: string, actorId: string, data: UpdateMeetingInput) {
  const meeting = await getMeeting(meetingId, workspaceId);
  Object.assign(meeting, data);
  await meeting.save();

  await recordActivity({
    workspaceId,
    projectId: meeting.projectId?.toString(),
    actorId,
    type: ActivityType.MEETING_UPDATED,
    entityType: 'Meeting',
    entityId: meeting._id.toString(),
    metadata: { changes: Object.keys(data) },
  });

  emitToWorkspace(workspaceId, SocketEvent.MEETING_UPDATED, meeting);
  return meeting;
}

export async function cancelMeeting(meetingId: string, workspaceId: string, actorId: string) {
  const meeting = await getMeeting(meetingId, workspaceId);
  meeting.status = MeetingStatus.CANCELLED;
  await meeting.save();

  await recordActivity({
    workspaceId,
    projectId: meeting.projectId?.toString(),
    actorId,
    type: ActivityType.MEETING_CANCELLED,
    entityType: 'Meeting',
    entityId: meeting._id.toString(),
  });

  emitToWorkspace(workspaceId, SocketEvent.MEETING_UPDATED, meeting);
  return meeting;
}

export async function deleteMeeting(meetingId: string, workspaceId: string) {
  const meeting = await getMeeting(meetingId, workspaceId);
  await meetingRepository.deleteById(meeting._id.toString());
}

export async function addParticipants(meetingId: string, workspaceId: string, _actorId: string, participantIds: string[]) {
  const meeting = await getMeeting(meetingId, workspaceId);
  const existing = new Set(meeting.participants.map((id) => id.toString()));
  const newIds = participantIds.filter((id) => !existing.has(id));

  meeting.participants.push(...(newIds as unknown as (typeof meeting.participants)[number][]));
  await meeting.save();

  if (newIds.length > 0) {
    await notifyUsers(newIds, {
      workspaceId,
      type: NotificationType.MEETING_INVITE,
      title: 'Meeting invitation',
      message: `You've been invited to "${meeting.title}"`,
      entityType: 'Meeting',
      entityId: meeting._id.toString(),
    });
  }

  return meeting;
}
