/** Backend origin and /api prefix — must match where uploads are served from (same as API host). */
export const BACKEND_ORIGIN =
  process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
export const API_URL = `${BACKEND_ORIGIN}/api`;
