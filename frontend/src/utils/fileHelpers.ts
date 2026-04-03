import { BACKEND_ORIGIN } from '../apiConfig';

/**
 * Build absolute URL for files under GET /api/files/{path}.
 * Uses the same BACKEND_ORIGIN as API calls so images never point at a different host/port than uploads.
 */
export const buildFileUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = BACKEND_ORIGIN.replace(/\/$/, '');
  const rel = path.replace(/^\//, '');
  return `${base}/api/files/${rel}`;
};
