import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Project, User, Notification, AuditLogEntry, Intervention } from '../types';
import { liveProjectService, LiveFetchResult } from '../services/liveProjectService';
import { DEMO_PROJECTS } from '../data/demonstrationProjects';
import { normalizeProject } from '../utils/normalizeProject';
import { calculateProjectRisk } from '../utils/riskEngine';
import { validateAndParseCsv, CsvValidationResult } from '../utils/csvParser';
import { authApi } from '../services/authApi';

export type NavigationTab =
  | 'dashboard'
  | 'projects'
  | 'project-detail'
  | 'gis-map'
  | 'interventions'
  | 'reports'
  | 'data-management'
  | 'audit-logs';

export type ConnectionStatus = 'CONNECTED' | 'DEMO DATA' | 'SYNCING' | 'ERROR';
export type DataSourceType = 'Live Source' | 'Uploaded CSV' | 'Demo Data';

export interface UploadHistoryRecord {
  id: string;
  fileName: string;
  uploadDate: string;
  records: number;
  updatedCount: number;
  addedCount: number;
  status: 'Processed' | 'Failed';
}

interface AppContextType {
  // Authentication & Security State
  user: User | null;
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  loginUser: (officialId: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logoutUser: () => Promise<void>;
  login: (email: string, pass: string) => boolean;
  logout: () => void;

  // Navigation
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  navigateToProject: (projectId: string) => void;

  // Master Dataset (Single Source of Truth - Contains ALL records)
  projects: Project[];
  currentProjects: Project[]; // alias for compatibility
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  currentProject: Project | null;

  // Derived Priority Spotlight Dataset (Top 20 Critical Projects max)
  priorityProjects: Project[];

  // Live Data & Connection Status
  dataSource: DataSourceType;
  connectionStatus: ConnectionStatus;
  lastUpdatedTimestamp: string;
  isRecentlyUpdated: boolean;
  isLoading: boolean;
  apiError: string | null;
  fetchLiveData: () => Promise<void>;
  resetToDemoData: () => void;
  returnToLiveData: () => void;

  // CSV Ingestion
  isCsvModalOpen: boolean;
  setIsCsvModalOpen: (open: boolean) => void;
  validateCsvFile: (csvText: string) => CsvValidationResult;
  uploadCsvData: (csvText: string, fileName: string, mode?: 'replace' | 'update') => {
    success: boolean;
    count?: number;
    errors?: string[];
  };

  // Upload History
  uploadHistory: UploadHistoryRecord[];
  sourceFileName: string | null;

  // Interventions & Audits
  interventions: Intervention[];
  interventionStatuses: Record<string, 'OPEN' | 'ESCALATED' | 'COMPLETED'>;
  escalateIntervention: (projectId: string, projectName: string) => void;
  completeIntervention: (projectId: string, projectName: string) => void;
  addIntervention: (intervention: Omit<Intervention, 'id' | 'createdAt'>) => void;
  updateInterventionStatus: (id: string, status: Intervention['status']) => void;
  auditLogs: AuditLogEntry[];
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;

  // Notifications
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;

  // Filter State
  selectedDistrict: string;
  setSelectedDistrict: (district: string) => void;
  availableDistricts: string[];
  filteredProjects: Project[];

  // Updates from UI simulation
  updateProjectData: (projectId: string, partial: Partial<Project>, reason?: string) => void;
}

const STORAGE_KEYS = {
  USER: 'bhoomialert_user_session_v5',
  PROJECTS: 'bhoomialert_current_projects_v5',
  DATA_SOURCE: 'bhoomialert_data_source_v5',
  HISTORY: 'bhoomialert_upload_history_v5',
  AUDIT: 'bhoomialert_audit_logs_v5',
  INTERVENTIONS: 'bhoomialert_interventions_v5',
  INTERVENTION_STATUSES: 'bhoomialert_intervention_statuses_v5',
};

const DEFAULT_USER: User = {
  name: 'District Revenue Officer',
  email: 'admin@bhoomialert.gov.in',
  role: 'District Administrator',
  department: 'Revenue & Land Acquisition Administration',
  district: 'Tamil Nadu Monitoring Cell',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bhoomialert_auth_status') === 'authenticated';
    } catch {
      return false;
    }
  });
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // User State
  const [user, setUser] = useState<User>(DEFAULT_USER);

  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  // Verify session on application mount with backend /api/auth/me
  useEffect(() => {
    let isMounted = true;
    const verifyAuth = async () => {
      try {
        const session = await authApi.getSession();
        if (isMounted) {
          if (session.authenticated && session.user) {
            const authUser: User = {
              name: session.user.name,
              email: `${session.user.officialId.toLowerCase()}@bhoomialert.gov.in`,
              role: session.user.role,
              department: session.user.department,
              district: session.user.district,
            };
            setUser(authUser);
            setIsAuthenticated(true);
            try {
              localStorage.setItem('bhoomialert_auth_status', 'authenticated');
              localStorage.setItem('bhoomialert_active_user', JSON.stringify(session.user));
            } catch {
              // ignore
            }
          } else {
            setIsAuthenticated(false);
            try {
              localStorage.removeItem('bhoomialert_auth_status');
              localStorage.removeItem('bhoomialert_active_user');
            } catch {
              // ignore
            }
          }
        }
      } catch {
        if (isMounted) {
          // If offline but local fallback exists, keep session
          const localStatus = localStorage.getItem('bhoomialert_auth_status');
          const localUserStr = localStorage.getItem('bhoomialert_active_user');
          if (localStatus === 'authenticated' && localUserStr) {
            try {
              const parsed = JSON.parse(localUserStr);
              setUser({
                name: parsed.name,
                email: `${parsed.officialId.toLowerCase()}@bhoomialert.gov.in`,
                role: parsed.role,
                department: parsed.department,
                district: parsed.district,
              });
              setIsAuthenticated(true);
            } catch {
              setIsAuthenticated(false);
            }
          } else {
            setIsAuthenticated(false);
            try {
              localStorage.removeItem('bhoomialert_auth_status');
              localStorage.removeItem('bhoomialert_active_user');
            } catch {
              // ignore
            }
          }
        }
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    };
    verifyAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Central Master Dataset (Live PPPIN Data & Uploaded CSV Data)
  const [liveProjects, setLiveProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 5) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [uploadedData, setUploadedData] = useState<Project[] | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Status indicators
  const [dataSource, setDataSource] = useState<DataSourceType>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DATA_SOURCE);
    if (saved === 'Live Source' || saved === 'Uploaded CSV') return saved;
    return 'Live Source';
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('SYNCING');
  const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState<string>(() => {
    const now = new Date();
    return (
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ', ' +
      now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    );
  });
  const [isRecentlyUpdated, setIsRecentlyUpdated] = useState<boolean>(false);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);

  // Active dataset logic:
  // if CSV uploaded -> activeDataset = uploadedData
  // else -> activeDataset = livePPPINData
  const activeDataset = useMemo<Project[]>(() => {
    if (dataSource === 'Uploaded CSV' && uploadedData && uploadedData.length > 0) {
      return uploadedData;
    }
    if (dataSource === 'Demo Data' && uploadedData && uploadedData.length > 0) {
      return uploadedData;
    }
    return liveProjects;
  }, [dataSource, uploadedData, liveProjects]);

  // Dynamically calculate project monitoring risk for EVERY project in activeDataset
  const calculatedProjects = useMemo<Project[]>(() => {
    return activeDataset.map((p) => calculateProjectRisk(p));
  }, [activeDataset]);

  const projects = calculatedProjects;

  // CSV Modal State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);

  // Upload History
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIT);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Interventions
  const [interventions, setInterventions] = useState<Intervention[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INTERVENTIONS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Intervention workflow status tracking per project (OPEN -> ESCALATED -> COMPLETED)
  const [interventionStatuses, setInterventionStatuses] = useState<Record<string, 'OPEN' | 'ESCALATED' | 'COMPLETED'>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INTERVENTION_STATUSES);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  // Save interventionStatuses to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INTERVENTION_STATUSES, JSON.stringify(interventionStatuses));
    } catch {
      // ignore
    }
  }, [interventionStatuses]);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Toast notifier
  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      title: type === 'error' ? 'System Warning' : type === 'success' ? 'Update Success' : 'Notification',
      message: msg,
      timestamp: 'Just now',
      type,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
  }, []);

  // Save projects to localStorage
  useEffect(() => {
    try {
      if (projects.length > 0) {
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
      }
      localStorage.setItem(STORAGE_KEYS.DATA_SOURCE, dataSource);
    } catch {
      // ignore
    }
  }, [projects, dataSource]);

  // Save uploadHistory to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(uploadHistory));
    } catch {
      // ignore
    }
  }, [uploadHistory]);

  // Save auditLogs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
    } catch {
      // ignore
    }
  }, [auditLogs]);

  // Save interventions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INTERVENTIONS, JSON.stringify(interventions));
    } catch {
      // ignore
    }
  }, [interventions]);

  // 3. Central Live Data Fetch Routine
  const fetchLiveData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    setConnectionStatus('SYNCING');

    try {
      const result: LiveFetchResult = await liveProjectService.fetchProjects();

      // Master live dataset = ALL live projects returned by API (e.g. 459 authentic PPPIN records)
      const normalized = result.projects.map((p, idx) => normalizeProject(p, idx + 1));
      setLiveProjects(normalized);
      setUploadedData(null); // Clear CSV/Demo override so activeDataset is livePPPINData
      setDataSource('Live Source');
      setConnectionStatus('CONNECTED');
      setLastUpdatedTimestamp(result.timestamp);
      setIsRecentlyUpdated(true);
      setSourceFileName(null);

      if (normalized.length > 0) {
        setActiveProjectId((prev) => {
          const exists = normalized.some((p) => p.id === prev || p.projectId === prev);
          return exists ? prev : normalized[0].id;
        });
      }

      showToast(`Connected to live source. Analyzed ${normalized.length} Tamil Nadu PPPIN project records.`, 'success');
    } catch (err: any) {
      console.warn('Live API unavailable:', err?.message);
      setApiError(err?.message || 'Unable to connect to live backend.');
      setConnectionStatus('ERROR');
      // If no live projects were previously loaded, fallback to authentic demo projects so dashboard is ready
      setLiveProjects((prev) => {
        if (prev.length === 0) {
          const demo = DEMO_PROJECTS.map((p, idx) => normalizeProject(p, idx + 1));
          if (demo.length > 0) setActiveProjectId(demo[0].id);
          return demo;
        }
        return prev;
      });
      showToast('Live source unavailable. Using offline demonstration dataset.', 'info');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Mount effect: attempt live connection on startup
  useEffect(() => {
    fetchLiveData();
  }, []);

  // Return to live data source
  const returnToLiveData = useCallback(() => {
    setUploadedData(null);
    setDataSource('Live Source');
    fetchLiveData();
  }, [fetchLiveData]);

  // Reset to Demo Data mode
  const resetToDemoData = useCallback(() => {
    const demo = DEMO_PROJECTS.map((p, idx) => normalizeProject(p, idx + 1));
    setUploadedData(demo);
    setDataSource('Demo Data');
    setConnectionStatus('DEMO DATA');
    setSourceFileName(null);
    if (demo.length > 0) setActiveProjectId(demo[0].id);
    const now = new Date();
    setLastUpdatedTimestamp(
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    );
    showToast('Loaded demonstration dataset.', 'info');
  }, [showToast]);

  // 4. CSV Validation & Upload Processing
  const validateCsvFile = useCallback((csvText: string): CsvValidationResult => {
    return validateAndParseCsv(csvText);
  }, []);

  const uploadCsvData = useCallback(
    (csvText: string, fileName: string, mode: 'replace' | 'update' = 'replace') => {
      const validation = validateAndParseCsv(csvText);

      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors.length > 0 ? validation.errors : ['Invalid CSV format.'],
        };
      }

      const now = new Date();
      const formattedTimestamp =
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      // Parse and normalize projects from CSV
      const parsedProjects = validation.parsedProjects.map((row, idx) =>
        normalizeProject(row, idx + 1)
      );

      setUploadedData(parsedProjects);
      setDataSource('Uploaded CSV');
      setConnectionStatus('CONNECTED');
      setIsRecentlyUpdated(true);
      setSourceFileName(fileName);
      setLastUpdatedTimestamp(formattedTimestamp);
      setApiError(null);

      if (parsedProjects.length > 0) {
        setActiveProjectId(parsedProjects[0].id);
      }

      // Add audit log
      const auditEntry: AuditLogEntry = {
        id: `aud-${Date.now()}`,
        timestamp: formattedTimestamp,
        projectId: 'ALL',
        projectName: `Dataset: ${fileName}`,
        action: `CSV Ingestion & Risk Recalculation`,
        source: 'CSV Upload',
        user: user?.name || 'Administrator',
        previousRisk: `${liveProjects.length} live records`,
        newRisk: `${parsedProjects.length} uploaded records`,
        details: `Loaded ${parsedProjects.length} records from ${fileName}. Calculated project monitoring risks dynamically.`,
      };
      setAuditLogs((prev) => [auditEntry, ...prev]);

      // Record in Upload History
      const historyItem: UploadHistoryRecord = {
        id: `upl-${Date.now()}`,
        fileName,
        uploadDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        records: parsedProjects.length,
        updatedCount: 0,
        addedCount: parsedProjects.length,
        status: 'Processed',
      };
      setUploadHistory((prev) => [historyItem, ...prev]);

      showToast(`Loaded ${parsedProjects.length} records from ${fileName}. Recalculated monitoring risk across dataset.`, 'success');

      return {
        success: true,
        count: parsedProjects.length,
      };
    },
    [user, liveProjects.length, showToast]
  );

  // Manual project parameter update simulation
  const updateProjectData = useCallback(
    (projectId: string, partial: Partial<Project>, reason: string = 'Administrative Parameter Update') => {
      const now = new Date();
      const formattedTimestamp =
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      const updater = (prev: Project[]) =>
        prev.map((p) => {
          if (p.id === projectId || p.projectId === projectId) {
            const merged = { ...p, ...partial, lastUpdated: now.toLocaleDateString('en-GB') };
            const recalculated = normalizeProject(merged);

            setAuditLogs((aPrev) => [
              {
                id: `aud-${Date.now()}`,
                timestamp: formattedTimestamp,
                projectId: p.projectId,
                projectName: p.projectName,
                action: 'Risk Recalculated',
                previousRisk: `${p.riskScore}% (${p.riskLevel})`,
                newRisk: `${recalculated.riskScore}% (${recalculated.riskLevel})`,
                user: user?.name || 'Administrator',
                details: `${reason}. Status: ${recalculated.status}, Risk: ${recalculated.riskLevel}`,
              },
              ...aPrev,
            ]);

            return recalculated;
          }
          return p;
        });

      if (uploadedData !== null) {
        setUploadedData((prev) => (prev ? updater(prev) : null));
      } else {
        setLiveProjects((prev) => updater(prev));
      }

      showToast(`Updated parameters for project ${projectId}.`, 'success');
    },
    [user, uploadedData, showToast]
  );

  // Interventions handling
  const addIntervention = useCallback(
    (intervention: Omit<Intervention, 'id' | 'createdAt'>) => {
      const newIntervention: Intervention = {
        ...intervention,
        id: `INT-${(interventions.length + 1).toString().padStart(2, '0')}`,
        createdAt: new Date().toLocaleDateString('en-GB'),
      };
      setInterventions((prev) => [newIntervention, ...prev]);
      showToast(`Intervention ${newIntervention.id} registered.`, 'success');
    },
    [interventions, showToast]
  );

  const updateInterventionStatus = useCallback((id: string, status: Intervention['status']) => {
    setInterventions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }, []);

  const addAuditLog = useCallback((entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `aud-${Date.now()}`,
      timestamp:
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        new Date().toLocaleDateString('en-GB'),
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  }, []);

  // Fully functional Escalate Action
  const escalateIntervention = useCallback(
    (projectId: string, projectName: string) => {
      const currentStatus = interventionStatuses[projectId] || 'OPEN';
      if (currentStatus === 'ESCALATED' || currentStatus === 'COMPLETED') {
        return; // Prevent duplicate escalation
      }

      setInterventionStatuses((prev) => ({
        ...prev,
        [projectId]: 'ESCALATED',
      }));

      // Update in interventions array if exists
      setInterventions((prev) =>
        prev.map((item) =>
          item.projectId === projectId || item.id === projectId
            ? { ...item, status: 'ESCALATED' }
            : item
        )
      );

      // Record in audit log
      addAuditLog({
        projectId,
        projectName,
        action: 'Intervention Escalated',
        previousRisk: currentStatus,
        newRisk: 'ESCALATED',
        user: user?.name || 'District Revenue Officer',
        details: `Intervention escalated to State Monitoring Directorate for project ${projectName} (${projectId}).`,
      });

      showToast(`Intervention for ${projectName} escalated.`, 'warning');
    },
    [interventionStatuses, addAuditLog, user, showToast]
  );

  // Fully functional Mark as Completed Action
  const completeIntervention = useCallback(
    (projectId: string, projectName: string) => {
      const currentStatus = interventionStatuses[projectId] || 'OPEN';
      if (currentStatus === 'COMPLETED') {
        return; // Prevent duplicate completion
      }

      setInterventionStatuses((prev) => ({
        ...prev,
        [projectId]: 'COMPLETED',
      }));

      // Update in interventions array if exists
      setInterventions((prev) =>
        prev.map((item) =>
          item.projectId === projectId || item.id === projectId
            ? { ...item, status: 'COMPLETED' }
            : item
        )
      );

      // Record in audit log
      addAuditLog({
        projectId,
        projectName,
        action: 'Intervention Completed',
        previousRisk: currentStatus,
        newRisk: 'COMPLETED',
        user: user?.name || 'District Revenue Officer',
        details: `Administrative intervention completed and verified for project ${projectName} (${projectId}).`,
      });

      showToast(`Intervention for ${projectName} marked as completed.`, 'success');
    },
    [interventionStatuses, addAuditLog, user, showToast]
  );

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const loginUser = useCallback(
    async (officialId: string, pass: string) => {
      try {
        const res = await authApi.login(officialId, pass);
        if (res.authenticated && res.user) {
          const authUser: User = {
            name: res.user.name,
            email: `${res.user.officialId.toLowerCase()}@bhoomialert.gov.in`,
            role: res.user.role,
            department: res.user.department,
            district: res.user.district,
          };
          setUser(authUser);
          setIsAuthenticated(true);
          try {
            localStorage.setItem('bhoomialert_auth_status', 'authenticated');
            localStorage.setItem('bhoomialert_active_user', JSON.stringify(res.user));
          } catch {
            // ignore
          }
          setActiveTab('dashboard');
          fetchLiveData();
          return { success: true };
        }
        return { success: false, message: res.message || 'Invalid Official ID or password.' };
      } catch (err: any) {
        return {
          success: false,
          message: err?.message || 'Unable to connect to the authentication service. Please try again.',
        };
      }
    },
    [fetchLiveData]
  );

  const logoutUser = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setIsAuthenticated(false);
      try {
        localStorage.removeItem('bhoomialert_auth_status');
        localStorage.removeItem('bhoomialert_active_user');
        localStorage.removeItem(STORAGE_KEYS.USER);
      } catch {
        // ignore
      }
      setUser(DEFAULT_USER);
      setActiveTab('dashboard');
    }
  }, []);

  const login = useCallback(
    (email: string, _pass: string) => {
      const loggedUser: User = {
        ...DEFAULT_USER,
        email: email || DEFAULT_USER.email,
      };
      setUser(loggedUser);
      setIsAuthenticated(true);
      try {
        localStorage.setItem('bhoomialert_auth_status', 'authenticated');
      } catch {
        // ignore
      }
      setActiveTab('dashboard');
      fetchLiveData();
      return true;
    },
    [fetchLiveData]
  );

  const logout = useCallback(() => {
    logoutUser();
  }, [logoutUser]);

  const navigateToProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
    setActiveTab('project-detail');
  }, []);

  // Derived available districts dynamically from master projects dataset
  // Derived unique districts from master projects dataset
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.district && p.district.trim()) {
        set.add(p.district.trim());
      }
    });
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [projects]);

  // Derived filtered projects by district (Full count, not sliced)
  // When selectedDistrict === 'ALL' or 'All', bypasses district filtering completely:
  // filteredLiveProjects = allLiveProjects (filteredLiveProjects.length === complete live dataset count)
  const filteredProjects = useMemo(() => {
    if (!selectedDistrict) return projects;
    const normalizedSelected = selectedDistrict.trim().toUpperCase();
    if (
      normalizedSelected === 'ALL' ||
      normalizedSelected === 'ALL DISTRICTS' ||
      normalizedSelected === 'ALL_DISTRICTS'
    ) {
      return projects;
    }
    return projects.filter(
      (p) => p.district && p.district.trim().toLowerCase() === selectedDistrict.trim().toLowerCase()
    );
  }, [projects, selectedDistrict]);

  // Derived Priority Projects (Top 20 Critical / High Risk assessed projects for Spotlight Display)
  const priorityProjects = useMemo(() => {
    const assessed = filteredProjects.filter((p) => p.hasRiskAssessment && p.riskScore !== null);
    if (assessed.length > 0) {
      return [...assessed]
        .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
        .slice(0, 20);
    }
    // If no projects assessed yet, show initial records
    return filteredProjects.slice(0, 20);
  }, [filteredProjects]);

  const currentProject = useMemo(() => {
    return (
      projects.find((p) => p.id === activeProjectId || p.projectId === activeProjectId) ||
      projects[0] ||
      null
    );
  }, [projects, activeProjectId]);

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated,
        isAuthChecking,
        loginUser,
        logoutUser,
        login,
        logout,
        activeTab,
        setActiveTab,
        navigateToProject,
        projects,
        currentProjects: projects,
        activeProjectId,
        setActiveProjectId,
        currentProject,
        priorityProjects,
        dataSource,
        connectionStatus,
        lastUpdatedTimestamp,
        isRecentlyUpdated,
        isLoading,
        apiError,
        fetchLiveData,
        resetToDemoData,
        returnToLiveData,
        isCsvModalOpen,
        setIsCsvModalOpen,
        validateCsvFile,
        uploadCsvData,
        uploadHistory,
        sourceFileName,
        interventions,
        interventionStatuses,
        escalateIntervention,
        completeIntervention,
        addIntervention,
        updateInterventionStatus,
        auditLogs,
        addAuditLog,
        notifications,
        markNotificationRead,
        clearAllNotifications,
        showToast,
        selectedDistrict,
        setSelectedDistrict,
        availableDistricts,
        filteredProjects,
        updateProjectData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
