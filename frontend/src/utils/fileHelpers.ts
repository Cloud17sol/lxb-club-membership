// Helper to build file URLs consistently
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export const buildFileUrl = (path?: string | null): string => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}/api/files/${path}`;
};
