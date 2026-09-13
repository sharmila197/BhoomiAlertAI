import { Project } from '../types';
import { normalizeProject } from '../utils/normalizeProject';

/**
 * Configurable API Base URL via Vite environment variables.
 * Default is empty string (same host / relative path) or whatever is defined in VITE_API_BASE_URL.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

/**
 * Custom Error for API operations with status code.
 */
export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Fetches all land acquisition projects from the live server API.
 * Endpoint: GET /api/projects (falls back to GET /projects if /api prefix is not in path)
 */
export async function fetchLiveProjects(): Promise<Project[]> {
  const primaryUrl = `${API_BASE_URL}/api/projects`;
  const fallbackUrls = [primaryUrl, 'http://127.0.0.1:5000/api/projects', 'http://localhost:5000/api/projects'];
  // Deduplicate URLs
  const urlsToTry = Array.from(new Set(fallbackUrls));

  let lastError: any = null;

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(`Server returned status ${response.status}: ${response.statusText}`, response.status);
      }

      const data = await response.json();

      let rawList: any[] = [];
      if (Array.isArray(data)) {
        rawList = data;
      } else if (Array.isArray(data?.data)) {
        rawList = data.data;
      } else if (Array.isArray(data?.projects)) {
        rawList = data.projects;
      } else if (data && typeof data === 'object') {
        rawList = [data];
      }

      const normalizedProjects: Project[] = rawList.map((item, idx) =>
        normalizeProject(item, idx + 1)
      );

      return normalizedProjects;
    } catch (err: any) {
      lastError = err;
    }
  }

  if (lastError instanceof ApiError) {
    throw lastError;
  }
  throw new ApiError(
    lastError?.message || 'Unable to connect to the live server. Please check your backend connection and try again.'
  );
}

/**
 * Updates project data on the live server.
 */
export async function updateLiveProject(projectId: string, payload: Partial<Project>): Promise<Project> {
  const url = `${API_BASE_URL}/api/projects/${projectId}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new ApiError(`Failed to update project: ${response.statusText}`, response.status);
    }

    const data = await response.json();
    return normalizeProject(data?.data || data);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err?.message || 'Failed to communicate with live server for project update.');
  }
}
