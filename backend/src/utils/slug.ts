import { nanoid } from 'nanoid';

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'untitled';
}

export function slugWithSuffix(input: string): string {
  return `${slugify(input)}-${nanoid(6).toLowerCase()}`;
}
