import { BACKEND_ORIGIN } from '../apiConfig';

/**
 * Build absolute URL for files under GET /api/files/{path}.
 * Uses the same BACKEND_ORIGIN as API calls so images never point at a different host/port than uploads.
 */
export const buildFileUrl = (path?: string | null): string => {
  if (!path) return '';
  let p = String(path).trim();
  if (p.startsWith('http')) return p;
  p = p.replace(/^\//, '');
  // Some legacy rows may store "api/files/..." without host — avoid double prefix
  if (p.startsWith('api/files/')) {
    p = p.slice('api/files/'.length);
  }
  const base = BACKEND_ORIGIN.replace(/\/$/, '');
  return `${base}/api/files/${p}`;
};
