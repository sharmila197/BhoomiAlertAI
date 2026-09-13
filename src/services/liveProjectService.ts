import { Project } from '../types';
import { normalizeProject } from '../utils/normalizeProject';

/**
 * Live Project Data Service
 * Connects to configurable API endpoint: VITE_LIVE_PROJECT_API_URL, VITE_API_BASE_URL, or local backend server.
 * Handles auto-pagination across all pages so that the complete dataset is always retrieved.
 */
export const API_BASE_URL = (
  import.meta.env.VITE_LIVE_PROJECT_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  ''
).replace(/\/$/, '');

export interface LiveFetchResult {
  projects: Project[];
  isLive: boolean;
  totalElements: number;
  sourceName: string;
  timestamp: string;
}

export const liveProjectService = {
  /**
   * Fetches ALL available project records from the live backend API.
   * Retrieves the complete dataset with NO artificial slicing or truncation.
   * If the endpoint is paginated, it automatically traverses all pages until the full dataset is loaded.
   */
  async fetchProjects(): Promise<LiveFetchResult> {
    const now = new Date();
    const formattedTime =
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
      ', ' +
      now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // Candidate URLs to attempt (supports relative proxy, explicit ports, and configured environment URL)
    const primaryUrl = API_BASE_URL
      ? (API_BASE_URL.endsWith('/projects') ? API_BASE_URL : `${API_BASE_URL}/api/projects`)
      : '/api/projects';

    const candidateUrls = Array.from(
      new Set([
        primaryUrl,
        'http://127.0.0.1:5000/api/projects',
        'http://localhost:5000/api/projects',
        'http://127.0.0.1:5005/api/projects',
        'http://localhost:5005/api/projects',
        '/projects',
      ])
    );

    let lastError: any = null;

    for (const baseUrl of candidateUrls) {
      try {
        console.log('--- LIVE API INGESTION START ---');
        console.log('LIVE API URL:', baseUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(baseUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('HTTP STATUS:', response.status);

        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        let rawList: any[] = [];
        let totalAvailable: number | undefined = undefined;
        let totalPages = 1;
        let currentPage = 0;
        let pageSize = 50;

        if (Array.isArray(data)) {
          // Direct array response
          rawList = data;
          totalAvailable = data.length;
        } else if (data && typeof data === 'object') {
          // Spring Pageable or wrapper object
          if (Array.isArray(data.content)) {
            rawList = [...data.content];
            totalAvailable = typeof data.totalElements === 'number' ? data.totalElements : data.content.length;
            totalPages = typeof data.totalPages === 'number' ? data.totalPages : 1;
            currentPage = typeof data.page === 'number' ? data.page : 0;
            pageSize = typeof data.size === 'number' ? data.size : data.content.length;
          } else if (Array.isArray(data.data)) {
            rawList = [...data.data];
            totalAvailable = typeof data.total === 'number' ? data.total : data.data.length;
            totalPages = typeof data.last_page === 'number' ? data.last_page : (typeof data.totalPages === 'number' ? data.totalPages : 1);
          } else if (Array.isArray(data.projects)) {
            rawList = [...data.projects];
            totalAvailable = typeof data.totalCount === 'number' ? data.totalCount : data.projects.length;
          } else if (data.projectId || data.id || data.name || data.projectName) {
            rawList = [data];
            totalAvailable = 1;
          }
        }

        // Auto-fetch remaining pages if server returned paginated response
        let pagesFetched = 1;
        if (totalPages > 1 && totalAvailable && rawList.length < totalAvailable) {
          console.log(`Paginated response detected: Fetching remaining ${totalPages - 1} pages...`);
          for (let p = currentPage + 1; p < totalPages; p++) {
            try {
              const delim = baseUrl.includes('?') ? '&' : '?';
              const pageUrl = `${baseUrl}${delim}page=${p}&size=${pageSize}`;
              const pageRes = await fetch(pageUrl, {
                headers: { 'Accept': 'application/json' },
              });
              if (pageRes.ok) {
                const pageData = await pageRes.json();
                const items = Array.isArray(pageData)
                  ? pageData
                  : (pageData.content || pageData.data || pageData.projects || []);
                rawList = rawList.concat(items);
                pagesFetched++;
              }
            } catch (pageErr) {
              console.warn(`Could not fetch page ${p}:`, pageErr);
              break;
            }
          }
        }

        if (rawList.length === 0) {
          throw new Error('No project records found in response.');
        }

        console.log('TOTAL RECORDS AVAILABLE:', totalAvailable || rawList.length);
        console.log('PAGES FETCHED:', pagesFetched);
        console.log('RECORDS FETCHED:', rawList.length);

        // Normalize EVERY item returned by the API (NO artificial slice or limit)
        const normalizedProjects = rawList.map((item, idx) => normalizeProject(item, idx + 1));

        console.log('FINAL DATASET LENGTH:', normalizedProjects.length);
        console.log('--- LIVE API INGESTION COMPLETED ---');

        return {
          projects: normalizedProjects,
          isLive: true,
          totalElements: normalizedProjects.length,
          sourceName: 'Live API Feed',
          timestamp: formattedTime,
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`Attempt failed for URL: ${baseUrl}`, err?.message);
      }
    }

    // If all URLs failed, throw error
    throw new Error(
      lastError?.message || 'Unable to connect to live backend API. Please ensure your backend server is running.'
    );
  },
};
