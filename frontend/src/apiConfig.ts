/** Backend origin and /api prefix — always use a fallback so builds never produce `uundefined/api`. */
export const BACKEND_ORIGIN =
  process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
export const API_URL = `${BACKEND_ORIGIN}/api`;
