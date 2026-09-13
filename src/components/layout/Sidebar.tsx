import React from 'react';
import { useApp, NavigationTab } from '../../context/AppContext';
import {
  LayoutDashboard,
  FolderKanban,
  AlertOctagon,
  Map,
  BrainCircuit,
  Wrench,
  FileBarChart2,
  Database,
  History,
  Building2,
  Upload,
} from 'lucide-react';

interface SidebarItem {
  id: NavigationTab;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, projects, interventions, setIsCsvModalOpen } = useApp();

  const totalProjects = projects.length;
  const highRiskCount = projects.filter((p) => p.riskLevel === 'HIGH').length;
  const pendingInterventionsCount = interventions.filter(
    (i) => i.status !== 'Completed'
  ).length;

  const navItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderKanban,
      badge: totalProjects > 0 ? totalProjects : undefined,
      badgeColor: 'bg-slate-800 text-slate-300 font-mono font-bold',
    },
    {
      id: 'gis-map',
      label: 'GIS Map',
      icon: Map,
    },
    {
      id: 'project-detail',
      label: 'Risk Analysis',
      icon: BrainCircuit,
      badge: highRiskCount > 0 ? `${highRiskCount} High` : undefined,
      badgeColor: 'bg-red-950 text-red-400 font-bold border border-red-800',
    },
    {
      id: 'interventions',
      label: 'Interventions',
      icon: Wrench,
      badge: pendingInterventionsCount > 0 ? `${pendingInterventionsCount}` : undefined,
      badgeColor: 'bg-amber-950 text-amber-300 font-bold border border-amber-800',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileBarChart2,
    },
    {
      id: 'data-management',
      label: 'Data Management',
      icon: Database,
    },
    {
      id: 'audit-logs',
      label: 'Audit Logs',
      icon: History,
    },
  ];

  return (
    <aside className="w-60 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col border-r border-slate-800 select-none min-h-[calc(100vh-65px)]">
      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group text-left ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    isActive
                      ? 'bg-blue-900 text-white font-bold'
                      : item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Upload CSV Button in Sidebar */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={() => setIsCsvModalOpen(true)}
          className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-lg border border-slate-700 flex items-center justify-center gap-2 transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-blue-400" />
          <span>Upload CSV Data</span>
        </button>
      </div>

      {/* Bottom Information Box */}
      <div className="p-3 m-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-2 text-slate-200 font-bold mb-0.5">
          <Building2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Monitoring System</span>
        </div>
        <p className="text-[10px] leading-tight text-slate-400">
          Spatial GIS Land Acquisition Risk Analytics.
        </p>
      </div>
    </aside>
  );
};
