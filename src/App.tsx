import React, { useEffect } from 'react';
import { AppProvider, useApp, NavigationTab } from './context/AppContext';
import { LoginPage } from './pages/LoginPage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { GisRiskMapPage } from './pages/GisRiskMapPage';
import { InterventionsPage } from './pages/InterventionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { CsvUploadModal } from './components/common/CsvUploadModal';
import { Loader2 } from 'lucide-react';

const TAB_ROUTES: Record<string, NavigationTab> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/projects': 'projects',
  '/project-detail': 'project-detail',
  '/gis-map': 'gis-map',
  '/interventions': 'interventions',
  '/reports': 'reports',
  '/data-management': 'data-management',
  '/audit-logs': 'audit-logs',
};

const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  // Sync initial URL or browser back/forward with active tab
  useEffect(() => {
    const path = window.location.pathname;
    if (TAB_ROUTES[path] && TAB_ROUTES[path] !== activeTab) {
      setActiveTab(TAB_ROUTES[path]);
    }

    const handlePopState = () => {
      const current = window.location.pathname;
      if (TAB_ROUTES[current]) {
        setActiveTab(TAB_ROUTES[current]);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update browser URL on tab change without reloading
  useEffect(() => {
    const currentPath = window.location.pathname;
    const targetPath = activeTab === 'dashboard' ? '/dashboard' : `/${activeTab}`;
    if (currentPath !== targetPath && currentPath !== '/' && activeTab === 'dashboard') {
      window.history.replaceState({}, '', '/dashboard');
    } else if (currentPath !== targetPath && currentPath !== '/') {
      window.history.pushState({}, '', targetPath);
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col font-sans text-[#0F172A]">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F4F7FB] min-h-[calc(100vh-65px)]">
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'projects' && <ProjectsPage />}
          {activeTab === 'project-detail' && <ProjectDetailPage />}
          {activeTab === 'gis-map' && <GisRiskMapPage />}
          {activeTab === 'interventions' && <InterventionsPage />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'data-management' && <DataManagementPage />}
          {activeTab === 'audit-logs' && <AuditLogsPage />}
        </main>
      </div>
      <CsvUploadModal />
    </div>
  );
};

const AppRouter: React.FC = () => {
  const { isAuthenticated, isAuthChecking, setActiveTab } = useApp();

  // Synchronize browser history and route guard
  useEffect(() => {
    if (!isAuthChecking) {
      const path = window.location.pathname;
      if (!isAuthenticated) {
        if (path !== '/login') {
          window.history.replaceState({}, '', '/login');
        }
      } else {
        if (path === '/login' || path === '') {
          window.history.replaceState({}, '', '/dashboard');
          setActiveTab('dashboard');
        }
      }
    }
  }, [isAuthenticated, isAuthChecking, setActiveTab]);

  // Loading state during initial session check
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white font-sans">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-2xl mb-4 shadow-lg border border-blue-400/40">
          भ
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span>Verifying Secure Officer Session...</span>
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          BhoomiAlert AI • National Informatics Standard
        </p>
      </div>
    );
  }

  // Unauthenticated user -> strictly show professional LoginPage
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Authenticated user -> directly render original dashboard layout
  return <MainLayout />;
};

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
