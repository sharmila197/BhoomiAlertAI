export interface AuthUser {
  officialId: string;
  name: string;
  role: string;
  department: string;
  district: string;
}

export interface AuthResponse {
  authenticated: boolean;
  user?: AuthUser;
  token?: string;
  message?: string;
  success?: boolean;
}

const API_BASE = '/api/auth';

/**
 * Built-in demo accounts ensuring the prototype remains fully operational
 * even if the Node backend server is offline or experiencing network proxy timeouts.
 */
export const DEMO_OFFICERS: Record<string, { name: string; role: string; department: string; district: string; pass: string }> = {
  'OFFICER-TN-001': {
    name: 'Thiru. R. Selvaraj',
    role: 'District Revenue Officer',
    department: 'Revenue & Land Acquisition Administration',
    district: 'Tamil Nadu Monitoring Cell',
    pass: 'GovPass@2026',
  },
  'DRO-ERODE-101': {
    name: 'Dr. M. Sangeetha, IAS',
    role: 'Competent Authority (CALA)',
    department: 'Revenue & Disaster Management',
    district: 'Erode',
    pass: 'GovPass@2026',
  },
};

export const authApi = {
  /**
   * Authenticate officer using Official ID / User ID and Password.
   * Connects to live backend API, with seamless local fallback if backend is offline.
   */
  async login(officialId: string, password: string): Promise<AuthResponse> {
    const trimmedId = officialId.trim();
    const cleanPassword = password.trim();

    // 1. Attempt connection to live backend server
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ officialId: trimmedId, password: cleanPassword }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json().catch(() => null);

      if (res.ok && data?.authenticated) {
        return data;
      }

      // If backend explicitly rejected due to wrong credentials
      if (res.status === 401 || res.status === 403 || res.status === 400) {
        return {
          authenticated: false,
          success: false,
          message: data?.message || 'Invalid Official ID or password.',
        };
      }
    } catch (networkErr) {
      console.warn('Backend authentication offline, attempting fallback authentication...', networkErr);
    }

    // 2. Client-side fallback authentication if backend is unreachable / 500
    const normalizedId = trimmedId.toUpperCase();
    const demoUser = DEMO_OFFICERS[normalizedId];

    if (demoUser && demoUser.pass === cleanPassword) {
      const authUser: AuthUser = {
        officialId: normalizedId,
        name: demoUser.name,
        role: demoUser.role,
        department: demoUser.department,
        district: demoUser.district,
      };

      return {
        authenticated: true,
        success: true,
        user: authUser,
        token: `demo-auth-jwt-${Date.now()}`,
        message: 'Successfully authenticated.',
      };
    }

    return {
      authenticated: false,
      success: false,
      message: 'Invalid Official ID or password. Use OFFICER-TN-001 / GovPass@2026 for demo access.',
    };
  },

  /**
   * Check active session status via HTTP-only cookie or session token
   */
  async getSession(): Promise<AuthResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${API_BASE}/me`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Backend offline or timeout
    }

    // Check localStorage fallback session
    try {
      const savedStatus = localStorage.getItem('bhoomialert_auth_status');
      const savedUserStr = localStorage.getItem('bhoomialert_active_user');
      if (savedStatus === 'authenticated' && savedUserStr) {
        const user = JSON.parse(savedUserStr);
        return {
          authenticated: true,
          user,
          success: true,
        };
      }
    } catch {
      // ignore
    }

    return {
      authenticated: false,
      message: 'Session expired or not found',
    };
  },

  /**
   * Invalidate session and clear cookie & localStorage
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
    } catch {
      // Ignore network failures on logout
    }

    try {
      localStorage.removeItem('bhoomialert_auth_status');
      localStorage.removeItem('bhoomialert_active_user');
    } catch {
      // ignore
    }
  },
};

