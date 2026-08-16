import { ProjectModel } from '../models/Project';
import { TaskModel } from '../models/Task';
import { MeetingModel } from '../models/Meeting';
import { DecisionModel } from '../models/Decision';
import { DocumentModel } from '../models/Document';
import { userRepository } from '../repositories/user.repository';
import { workspaceMemberRepository } from '../repositories/workspaceMember.repository';
import { SearchEntityType } from '../constants/enums';
import { normalizePagination, PaginationQuery } from '../utils/pagination';
import { buildPagination } from '../utils/ApiResponse';

export interface SearchResult {
  type: SearchEntityType;
  id: string;
  title: string;
  snippet?: string;
  projectId?: string;
}

export interface SearchQuery extends PaginationQuery {
  q: string;
  workspaceId: string;
  type?: SearchEntityType;
  projectId?: string;
}

/**
 * Global search implemented with MongoDB text indexes for the MVP. Each
 * entity is searched independently behind a small helper so swapping this
 * for MongoDB Atlas Search later only requires changing the bodies of
 * these helpers, not the calling code in search.controller.ts.
 */
async function searchProjects(q: string, workspaceId: string, skip: number, limit: number) {
  const filter = { workspaceId, $text: { $search: q } };
  const [items, total] = await Promise.all([
    ProjectModel.find(filter, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } }).skip(skip).limit(limit),
    ProjectModel.countDocuments(filter),
  ]);
  const results: SearchResult[] = items.map((p) => ({ type: SearchEntityType.PROJECT, id: p._id.toString(), title: p.name, snippet: p.description }));
  return { results, total };
}

async function searchTasks(q: string, workspaceId: string, projectId: string | undefined, skip: number, limit: number) {
  const filter: Record<string, unknown> = { workspaceId, $text: { $search: q } };
  if (projectId) filter.projectId = projectId;
  const [items, total] = await Promise.all([
    TaskModel.find(filter, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } }).skip(skip).limit(limit),
    TaskModel.countDocuments(filter),
  ]);
  const results: SearchResult[] = items.map((t) => ({
    type: SearchEntityType.TASK,
    id: t._id.toString(),
    title: t.title,
    snippet: t.description,
    projectId: t.projectId.toString(),
  }));
  return { results, total };
}

async function searchMeetings(q: string, workspaceId: string, projectId: string | undefined, skip: number, limit: number) {
  const filter: Record<string, unknown> = { workspaceId, $text: { $search: q } };
  if (projectId) filter.projectId = projectId;
  const [items, total] = await Promise.all([
    MeetingModel.find(filter, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } }).skip(skip).limit(limit),
    MeetingModel.countDocuments(filter),
  ]);
  const results: SearchResult[] = items.map((m) => ({
    type: SearchEntityType.MEETING,
    id: m._id.toString(),
    title: m.title,
    snippet: m.description,
    projectId: m.projectId?.toString(),
  }));
  return { results, total };
}

async function searchDecisions(q: string, workspaceId: string, projectId: string | undefined, skip: number, limit: number) {
  const filter: Record<string, unknown> = { workspaceId, $text: { $search: q } };
  if (projectId) filter.projectId = projectId;
  const [items, total] = await Promise.all([
    DecisionModel.find(filter, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } }).skip(skip).limit(limit),
    DecisionModel.countDocuments(filter),
  ]);
  const results: SearchResult[] = items.map((d) => ({
    type: SearchEntityType.DECISION,
    id: d._id.toString(),
    title: d.title,
    snippet: d.decision,
    projectId: d.projectId?.toString(),
  }));
  return { results, total };
}

async function searchDocuments(q: string, workspaceId: string, projectId: string | undefined, skip: number, limit: number) {
  const filter: Record<string, unknown> = { workspaceId, $text: { $search: q } };
  if (projectId) filter.projectId = projectId;
  const [items, total] = await Promise.all([
    DocumentModel.find(filter, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } }).skip(skip).limit(limit),
    DocumentModel.countDocuments(filter),
  ]);
  const results: SearchResult[] = items.map((d) => ({
    type: SearchEntityType.DOCUMENT,
    id: d._id.toString(),
    title: d.title,
    snippet: d.content.slice(0, 200),
    projectId: d.projectId?.toString(),
  }));
  return { results, total };
}

async function searchMembers(q: string, workspaceId: string, skip: number, limit: number) {
  const memberUserIds = await workspaceMemberRepository.listUserIdsByWorkspace(workspaceId);
  const memberIds = new Set(memberUserIds);
  const users = await userRepository.searchByText(q, 1000);
  const filtered = users.filter((u) => memberIds.has(u._id.toString()));
  const total = filtered.length;
  const page = filtered.slice(skip, skip + limit);
  const results: SearchResult[] = page.map((u) => ({ type: SearchEntityType.MEMBER, id: u._id.toString(), title: u.name, snippet: u.email }));
  return { results, total };
}

export async function globalSearch(query: SearchQuery) {
  const { page, limit, skip } = normalizePagination(query);
  const { q, workspaceId, type, projectId } = query;

  if (type) {
    const { results, total } =
      type === SearchEntityType.PROJECT
        ? await searchProjects(q, workspaceId, skip, limit)
        : type === SearchEntityType.TASK
          ? await searchTasks(q, workspaceId, projectId, skip, limit)
          : type === SearchEntityType.MEETING
            ? await searchMeetings(q, workspaceId, projectId, skip, limit)
            : type === SearchEntityType.DECISION
              ? await searchDecisions(q, workspaceId, projectId, skip, limit)
              : type === SearchEntityType.DOCUMENT
                ? await searchDocuments(q, workspaceId, projectId, skip, limit)
                : await searchMembers(q, workspaceId, skip, limit);
    return { items: results, pagination: buildPagination(page, limit, total) };
  }

  // No type filter: fan out across every entity with a small per-type cap
  // and merge. Pagination reflects the combined result count.
  const perTypeLimit = limit;
  const [projects, tasks, meetings, decisions, documents, members] = await Promise.all([
    searchProjects(q, workspaceId, 0, perTypeLimit),
    searchTasks(q, workspaceId, projectId, 0, perTypeLimit),
    searchMeetings(q, workspaceId, projectId, 0, perTypeLimit),
    searchDecisions(q, workspaceId, projectId, 0, perTypeLimit),
    searchDocuments(q, workspaceId, projectId, 0, perTypeLimit),
    searchMembers(q, workspaceId, 0, perTypeLimit),
  ]);

  const combined = [...projects.results, ...tasks.results, ...meetings.results, ...decisions.results, ...documents.results, ...members.results];
  const total = projects.total + tasks.total + meetings.total + decisions.total + documents.total + members.total;

  return { items: combined.slice(skip, skip + limit), pagination: buildPagination(page, limit, total) };
}
