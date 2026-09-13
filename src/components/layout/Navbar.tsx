import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Bell,
  UserCheck,
  Shield,
  LogOut,
  ChevronDown,
  AlertCircle,
  MapPin,
  CheckCheck,
  RefreshCw,
  Upload,
  Database,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    user,
    logout,
    currentProjects,
    navigateToProject,
    notifications,
    markNotificationRead,
    clearAllNotifications,
    setActiveTab,
    dataSource,
    sourceFileName,
    fetchLiveData,
    resetToDemoData,
    returnToLiveData,
    setIsCsvModalOpen,
    isLoading,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const unreadNotifs = notifications.filter((n) => !n.read);

  const filteredProjects = searchQuery.trim()
    ? currentProjects.filter(
        (p) =>
          p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.district.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-gov-navy text-white sticky top-0 z-40 shadow-md border-b border-slate-700">
      {/* Main Navbar */}
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Brand / Logo & Header Titles */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md border border-blue-400/40">
              <span className="text-white font-black text-xl font-mono tracking-tighter">
                भ
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-white font-heading">
                  BhoomiAlert AI
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono hidden lg:inline-block">
                  Spatial GIS Dashboard
                </span>
              </div>
              <p className="text-[11px] text-slate-300 hidden md:block">
                Real-time monitoring of land acquisition projects, compensation progress and delay risk indicators.
              </p>
            </div>
          </div>
        </div>

        {/* Global Search Project across Master Dataset */}
        <div className="flex-1 max-w-xs sm:max-w-sm lg:max-w-md relative hidden sm:block" ref={searchRef}>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search across all ${currentProjects.length} projects...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
            />
          </div>

          {/* Search Dropdown Results */}
          {showSearchDropdown && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white text-slate-900 rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="p-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Matching Projects ({filteredProjects.length})</span>
                <span>Select to View</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        navigateToProject(p.id);
                        setShowSearchDropdown(false);
                        setSearchQuery('');
                      }}
                      className="w-full px-3 py-2.5 text-left hover:bg-blue-50 flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-700">
                            {p.id}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 group-hover:text-blue-600">
                            {p.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {p.district}
                          </span>
                          <span>•</span>
                          <span>{p.currentStage || p.status}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                            p.hasRiskAssessment && p.riskScore !== null
                              ? p.riskLevel === 'HIGH' || p.riskScore >= 70
                                ? 'bg-red-100 text-red-800'
                                : p.riskLevel === 'MEDIUM' || p.riskScore >= 40
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.hasRiskAssessment && p.riskScore !== null ? `${p.riskScore}%` : 'PENDING'}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No matching projects found for "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Action Icons & Data Source Indicator */}
        <div className="flex items-center gap-2.5">
          {/* Data Source Indicator Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                dataSource === 'Live Source'
                  ? 'bg-emerald-400 animate-pulse'
                  : dataSource === 'Uploaded CSV'
                  ? 'bg-blue-400'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300 font-medium">
              Data Source:{' '}
              <strong className="text-white font-mono">
                {dataSource === 'Live Source'
                  ? `Live Source (${currentProjects.length})`
                  : dataSource === 'Uploaded CSV'
                  ? `CSV: ${sourceFileName || 'Uploaded'} (${currentProjects.length})`
                  : `Demo Data (${currentProjects.length})`}
              </strong>
            </span>
          </div>

          {/* Action Buttons: Refresh / Upload CSV / Return to Live */}
          {dataSource === 'Uploaded CSV' ? (
            <button
              onClick={returnToLiveData}
              disabled={isLoading}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
              title="Return to live feed"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Return to Live Data</span>
            </button>
          ) : (
            <button
              onClick={() => fetchLiveData()}
              disabled={isLoading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
              title="Refresh project data from live server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
            title="Upload CSV to update dashboard dataset"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV</span>
          </button>

          {/* Notification Icon */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 relative transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-gov-navy">
                  {unreadNotifs.length}
                </span>
              )}
            </button>

            {/* Notification Popover */}
            {showNotifDropdown && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      System Notifications
                    </span>
                  </div>
                  {unreadNotifs.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="text-[11px] text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markNotificationRead(n.id);
                          if (n.projectId) {
                            navigateToProject(n.projectId);
                            setShowNotifDropdown(false);
                          }
                        }}
                        className={`p-3 text-left hover:bg-slate-50 transition-colors cursor-pointer ${
                          !n.read ? 'bg-amber-50/60 font-medium' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <AlertCircle
                            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                              n.type === 'error' ? 'text-red-600' : n.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
                            }`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">
                                {n.title}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {n.timestamp}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 leading-snug">
                              {n.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No active alerts.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Role Badge */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 pl-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-white border border-slate-700 transition-all cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">
                {user?.name ? user.name[0] : 'O'}
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-xs font-bold leading-tight">{user?.name || 'Officer'}</div>
                <div className="text-[10px] text-slate-400">{user?.role || 'Administrator'}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1">
                <div className="p-3 bg-slate-50 border-b border-slate-200">
                  <div className="text-xs font-bold text-slate-900">{user?.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{user?.email}</div>
                  <div className="text-[10px] font-bold text-blue-700 mt-1 uppercase tracking-wider">{user?.department}</div>
                </div>

                <div className="p-1.5 space-y-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      resetToDemoData();
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset to Demo Data (5)</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
