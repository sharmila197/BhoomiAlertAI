import React from 'react';
import { useApp } from '../context/AppContext';
import {
  FolderKanban,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ArrowRight,
  MapPin,
  RefreshCw,
  Upload,
  Layers,
  Filter,
  Activity,
  AlertCircle,
  Database,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { RISK_COLORS, DISTRICT_PALETTE } from '../constants/theme';
import { ProjectInterventionItem, generateProjectInterventions } from '../utils/interventionEngine';
import { formatAcquisitionProgress } from '../utils/acquisitionProgress';
import { StageWiseRiskAssessment } from '../components/common/StageWiseRiskAssessment';

export const DashboardPage: React.FC = () => {
  const {
    filteredProjects,
    projects,
    priorityProjects,
    selectedDistrict,
    setSelectedDistrict,
    availableDistricts,
    isLoading,
    apiError,
    fetchLiveData,
    resetToDemoData,
    setIsCsvModalOpen,
    navigateToProject,
    setActiveTab,
    dataSource,
    connectionStatus,
    lastUpdatedTimestamp,
    isRecentlyUpdated,
    sourceFileName,
    interventionStatuses,
    escalateIntervention,
    completeIntervention,
  } = useApp();

  // Loading State
  if (isLoading && projects.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4 my-8">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <div>
          <h3 className="text-base font-bold text-slate-800">Connecting to Live Server...</h3>
          <p className="text-xs text-slate-500 mt-1">
            Fetching real-time land acquisition records from backend API.
          </p>
        </div>
      </div>
    );
  }

  // Error State: Professional error state when API fails and no data is available
  if (apiError && projects.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-10 text-center shadow-sm space-y-4 my-8 max-w-xl mx-auto">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-heading">
            Unable to load live project data.
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            {apiError}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            You can retry the live connection, switch to the standard 5-project demo dataset, or upload a CSV dataset.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => fetchLiveData()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
          <button
            onClick={() => resetToDemoData()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Use Demo Data</span>
          </button>
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV</span>
          </button>
        </div>
      </div>
    );
  }

  // Dynamic KPI Calculations strictly from complete active filtered dataset
  const currentDataset = filteredProjects;
  const totalProjects = currentDataset.length;

  // 1. TOTAL LIVE PROJECTS = total projects in current active dataset
  // 2. HIGH RISK = count of projects with riskLevel = "HIGH"
  const highRiskCount = currentDataset.filter((p) => p.riskLevel === 'HIGH').length;

  // 3. MEDIUM RISK = count of projects with riskLevel = "MEDIUM"
  const mediumRiskCount = currentDataset.filter((p) => p.riskLevel === 'MEDIUM').length;

  // 4. LOW RISK = count of projects with riskLevel = "LOW"
  const lowRiskCount = currentDataset.filter((p) => p.riskLevel === 'LOW').length;

  // Validation: HIGH + MEDIUM + LOW = TOTAL PROJECTS (Requirement 4)
  if (highRiskCount + mediumRiskCount + lowRiskCount !== totalProjects) {
    console.warn('Risk counts do not sum to total projects:', {
      totalProjects,
      sum: highRiskCount + mediumRiskCount + lowRiskCount,
    });
  }

  // Actionable Project Interventions (Capped at 20 highest priority items)
  const interventionsList: ProjectInterventionItem[] = generateProjectInterventions(currentDataset, 20);

  // Dynamic Risk Distribution Data for Donut Chart (Semantic: High = Red, Medium = Amber, Low = Green)
  const riskDistributionData = [
    { name: 'High', value: highRiskCount, color: RISK_COLORS.HIGH },
    { name: 'Medium', value: mediumRiskCount, color: RISK_COLORS.MEDIUM },
    { name: 'Low', value: lowRiskCount, color: RISK_COLORS.LOW },
  ];

  // Dynamic District-Wise Aggregation
  const districtAggregationMap = new Map<string, { total: number; high: number; med: number; low: number }>();
  currentDataset.forEach((p) => {
    const d = p.district || 'Other';
    const entry = districtAggregationMap.get(d) || { total: 0, high: 0, med: 0, low: 0 };
    entry.total += 1;
    if (p.riskLevel === 'HIGH') entry.high += 1;
    else if (p.riskLevel === 'MEDIUM') entry.med += 1;
    else if (p.riskLevel === 'LOW') entry.low += 1;
    districtAggregationMap.set(d, entry);
  });

  const districtWiseData = Array.from(districtAggregationMap.entries())
    .map(([district, stats]) => ({
      district,
      total: stats.total,
      high: stats.high,
      med: stats.med,
      low: stats.low,
    }))
    .sort((a, b) => b.total - a.total);

  // Spotlight display count
  const spotlightCount = priorityProjects.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header with Earth / Land / Infrastructure Aerial Visual */}
      <div className="relative overflow-hidden rounded-xl border border-[#0F2747]/80 bg-[#0B1E36] p-5 lg:p-6 shadow-[0_4px_20px_rgba(15,23,42,0.18)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Subtle realistic Earth / Satellite aerial land & road infrastructure background */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none opacity-20 mix-blend-luminosity"
          style={{ backgroundImage: "url('/earth_land_bg.jpg')" }}
        />
        {/* Professional deep navy / blue-gray protective overlay for maximum text contrast */}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#0B1E36]/95 via-[#0F2747]/90 to-[#0B1E36]/85 pointer-events-none" />

        {/* Brand Section (Left) */}
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight drop-shadow-xs">
              BhoomiAlert AI — Live Project Risk Dashboard
            </h1>
            {isRecentlyUpdated && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider backdrop-blur-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Synced
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 font-medium">
            Tamil Nadu Infrastructure Portfolio • Land Acquisition Risk Monitoring Cell
          </p>
        </div>

        {/* Control Section (Right) */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-3.5 flex-shrink-0">
          {/* Status & Meta Info Box */}
          <div className="p-2 px-3 bg-slate-900/80 backdrop-blur-xs rounded-lg border border-slate-700/80 flex items-center gap-3 text-xs shadow-inner">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold tracking-wider">Data Source</span>
              <span className="font-bold text-white font-sans text-[11px] flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    dataSource === 'Live Source'
                      ? 'bg-[#059669] animate-pulse'
                      : dataSource === 'Uploaded CSV'
                      ? 'bg-[#2563EB]'
                      : 'bg-[#D97706]'
                  }`}
                />
                {dataSource === 'Live Source'
                  ? `Live PPPIN Source (${projects.length.toLocaleString()} Tamil Nadu records)`
                  : dataSource === 'Uploaded CSV'
                  ? `Merged Dataset (${sourceFileName || 'Uploaded CSV'}, ${projects.length.toLocaleString()} records)`
                  : `Demo Dataset (${projects.length.toLocaleString()} records)`}
              </span>
            </div>

            {lastUpdatedTimestamp && (
              <div className="border-l border-slate-700 pl-3">
                <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold tracking-wider">Last Updated</span>
                <span className="text-[10px] text-slate-300 font-mono font-medium whitespace-nowrap">{lastUpdatedTimestamp}</span>
              </div>
            )}
          </div>

          {/* Action Buttons Group — Strictly aligned on the SAME horizontal row */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Refresh Data: Secondary Button */}
            <button
              onClick={() => fetchLiveData()}
              disabled={isLoading}
              className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-white rounded-lg border border-slate-600 hover:border-slate-500 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap disabled:opacity-60"
              title="Refresh latest project data from live API"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-300 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>

            {/* Upload CSV: Primary Button */}
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="px-3.5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg border border-blue-500 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 text-white" />
              <span>Upload CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* District Filter Toolbar & Dynamic Total Indicator */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.06)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#2563EB]" />
          <span className="font-bold text-[#0F2747] uppercase tracking-wider text-[11px]">Filter by District:</span>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="p-1.5 px-3 border border-[#CBD5E1] rounded-lg bg-white text-[#0F172A] font-medium text-xs focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none cursor-pointer shadow-2xs"
          >
            {availableDistricts.map((d) => (
              <option key={d} value={d}>
                {d.toUpperCase() === 'ALL' ? 'All Districts' : d}
              </option>
            ))}
          </select>
        </div>

        {/* Accurate Dynamic Wording */}
        <div className="text-[#64748B] font-mono text-xs">
          Monitoring <strong className="text-[#0F172A]">{totalProjects.toLocaleString()}</strong> Live Projects across Tamil Nadu
        </div>
      </div>

      {/* 4 Dynamic Full-Color KPI Cards: TOTAL LIVE PROJECTS (Blue) | HIGH RISK (Red) | MEDIUM RISK (Amber) | LOW RISK (Green) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TOTAL LIVE PROJECTS (Full Blue Card) */}
        <div className="bg-[#2563EB] rounded-xl p-5 border border-blue-700 shadow-[0_2px_8px_rgba(37,99,235,0.2)] hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)] transition-all flex flex-col justify-between text-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Total Live Projects</span>
            <div className="p-2 rounded-lg bg-white/15 text-white border border-white/20">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white font-mono">{totalProjects.toLocaleString()}</div>
            <div className="text-[11px] text-blue-100 mt-1 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-white"></span>
              <span>Active Portfolio</span>
            </div>
          </div>
        </div>

        {/* Card 2: HIGH RISK (Full Red Card) */}
        <div className="bg-[#DC2626] rounded-xl p-5 border border-red-700 shadow-[0_2px_8px_rgba(220,38,38,0.2)] hover:shadow-[0_4px_12px_rgba(220,38,38,0.3)] transition-all flex flex-col justify-between text-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">High Risk</span>
            <div className="p-2 rounded-lg bg-white/15 text-white border border-white/20">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white font-mono">{highRiskCount.toLocaleString()}</div>
            <div className="text-[11px] text-red-100 mt-1 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-white"></span>
              <span>Critical Delay Risk</span>
            </div>
          </div>
        </div>

        {/* Card 3: MEDIUM RISK (Full Amber/Orange Card) */}
        <div className="bg-[#D97706] rounded-xl p-5 border border-amber-700 shadow-[0_2px_8px_rgba(217,119,6,0.2)] hover:shadow-[0_4px_12px_rgba(217,119,6,0.3)] transition-all flex flex-col justify-between text-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Medium Risk</span>
            <div className="p-2 rounded-lg bg-white/15 text-white border border-white/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white font-mono">{mediumRiskCount.toLocaleString()}</div>
            <div className="text-[11px] text-amber-100 mt-1 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-white"></span>
              <span>Moderate Delay Risk</span>
            </div>
          </div>
        </div>

        {/* Card 4: LOW RISK (Full Green Card) */}
        <div className="bg-[#059669] rounded-xl p-5 border border-emerald-700 shadow-[0_2px_8px_rgba(5,150,105,0.2)] hover:shadow-[0_4px_12px_rgba(5,150,105,0.3)] transition-all flex flex-col justify-between text-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Low Risk</span>
            <div className="p-2 rounded-lg bg-white/15 text-white border border-white/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-white font-mono">{lowRiskCount.toLocaleString()}</div>
            <div className="text-[11px] text-emerald-100 mt-1 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-white"></span>
              <span>On Schedule</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Risk Distribution Donut Chart */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.06)] space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
            <h3 className="text-sm font-bold text-[#0F2747] uppercase tracking-wider">
              Delay Risk Classification
            </h3>
            <span className="text-[10px] font-mono text-[#94A3B8]">N={totalProjects.toLocaleString()}</span>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* Background Ring when counts are 0 so the donut structure is visible */}
                {highRiskCount + mediumRiskCount + lowRiskCount === 0 && (
                  <Pie
                    data={[{ value: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    fill="#f8fafc"
                    stroke="#e2e8f0"
                    strokeWidth={1.5}
                    dataKey="value"
                    isAnimationActive={false}
                  />
                )}
                <Pie
                  data={riskDistributionData.filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {riskDistributionData.filter((d) => d.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} Projects`, `${name} Risk`]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black font-mono text-[#0F2747]">
                {highRiskCount + mediumRiskCount + lowRiskCount}
              </span>
              <span className="text-[10px] uppercase font-semibold text-[#94A3B8]">Assessed</span>
            </div>
          </div>

          {/* Semantic Legend */}
          <div className="flex items-center justify-center gap-4 text-xs font-medium text-[#64748B] pb-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS.HIGH }} />
              <span>High — {highRiskCount}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS.MEDIUM }} />
              <span>Medium — {mediumRiskCount}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS.LOW }} />
              <span>Low — {lowRiskCount}</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E2E8F0] text-center text-xs">
            <div className="p-2.5 bg-red-50/50 border border-red-200/80 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-[10px] text-[#DC2626] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RISK_COLORS.HIGH }} />
                <span>HIGH</span>
              </div>
              <span className="font-mono font-black text-[#DC2626] text-base mt-0.5 block">{highRiskCount}</span>
            </div>
            <div className="p-2.5 bg-amber-50/50 border border-amber-200/80 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-[10px] text-[#D97706] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RISK_COLORS.MEDIUM }} />
                <span>MEDIUM</span>
              </div>
              <span className="font-mono font-black text-[#D97706] text-base mt-0.5 block">{mediumRiskCount}</span>
            </div>
            <div className="p-2.5 bg-emerald-50/50 border border-emerald-200/80 rounded-lg">
              <div className="flex items-center justify-center gap-1 text-[10px] text-[#059669] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RISK_COLORS.LOW }} />
                <span>LOW</span>
              </div>
              <span className="font-mono font-black text-[#059669] text-base mt-0.5 block">{lowRiskCount}</span>
            </div>
          </div>
        </div>

        {/* District-Wise Aggregation Bar Chart */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.06)] space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
            <h3 className="text-sm font-bold text-[#0F2747] uppercase tracking-wider">
              District-Wise Project Distribution
            </h3>
            <span className="text-[10px] text-[#94A3B8] font-mono">Live Districts ({districtWiseData.length})</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districtWiseData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="district" angle={-25} textAnchor="end" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  formatter={(val: any) => [`${val} Projects`, 'Project Count']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="total" name="Project Count" radius={[4, 4, 0, 0]}>
                  {districtWiseData.map((_, index) => (
                    <Cell
                      key={`dist-cell-${index}`}
                      fill={DISTRICT_PALETTE[index % DISTRICT_PALETTE.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stage-Wise Delay Risk Assessment Spotlight for Priority Project */}
      {priorityProjects.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-pulse" />
              <h3 className="text-sm font-bold text-[#0F2747] uppercase tracking-wider">
                Stage-Wise Risk Assessment Spotlight: {priorityProjects[0].projectName} ({priorityProjects[0].projectId})
              </h3>
            </div>
            <button
              onClick={() => navigateToProject(priorityProjects[0].id || priorityProjects[0].projectId)}
              className="text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 cursor-pointer"
            >
              <span>Inspect Full Project Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <StageWiseRiskAssessment
            project={priorityProjects[0]}
            onNavigateToUpdate={() => navigateToProject(priorityProjects[0].id || priorityProjects[0].projectId)}
          />
        </div>
      )}

      {/* Priority Project Spotlight Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#2563EB]" />
            <div>
              <h3 className="text-sm font-bold text-[#0F2747] uppercase tracking-wider">
                Priority Project Risk Spotlight
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Displaying priority infrastructure projects across Tamil Nadu districts
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('projects')}
            className="text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Project Table ({totalProjects.toLocaleString()} Projects)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#475569] font-bold uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-4">Project ID</th>
                <th className="py-3 px-4">Project Name</th>
                <th className="py-3 px-4">District</th>
                <th className="py-3 px-4">Sector / Status</th>
                <th className="py-3 px-4">Acquisition Progress</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Primary Risk Factors</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {priorityProjects.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigateToProject(p.id)}
                  className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono font-bold text-[#2563EB]">{p.id}</td>
                  <td className="py-3 px-4 font-bold text-[#0F172A]">{p.name}</td>
                  <td className="py-3 px-4 text-[#64748B]">{p.district}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#0F2747] border border-[#E2E8F0]">
                      {p.sector || p.currentStage || p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-[#0F172A]">
                    {formatAcquisitionProgress(p.acquisitionProgress)}
                  </td>
                  <td className="py-3 px-4">
                    {p.riskLevel === 'HIGH' ? (
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-red-50 text-[#DC2626] border border-red-200">
                        HIGH
                      </span>
                    ) : p.riskLevel === 'MEDIUM' ? (
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-amber-50 text-[#D97706] border border-amber-200">
                        MEDIUM
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-emerald-50 text-[#059669] border border-emerald-200">
                        LOW
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-[#0F172A]">
                    <span>{p.riskScore ?? 0}</span>
                    <span className="text-[10px] text-[#94A3B8] font-normal"> / 100</span>
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-[11px] text-[#64748B]" title={p.riskFactors?.[0] || 'Standard monitoring'}>
                    {p.riskFactors?.[0] ? `• ${p.riskFactors[0]}` : '• Routine monitoring'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToProject(p.id);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-[#2563EB] text-[#2563EB] hover:text-white font-bold rounded-lg border border-[#CBD5E1] hover:border-[#2563EB] text-xs transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Actionable Project Interventions Section */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563EB] border border-blue-100">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#0F2747] uppercase tracking-wider font-heading">
                  Project Interventions
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200 font-mono">
                  {interventionsList.length} Actionable Items
                </span>
              </div>
              <p className="text-[11px] text-[#64748B]">
                Actionable administrative interventions prioritized by risk category, delay timeline, and parcel bottlenecks
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('interventions')}
            className="text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 cursor-pointer"
          >
            <span>Open Compliance Tracker</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5">
          {interventionsList.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <CheckCircle2 className="w-8 h-8 text-[#059669] mx-auto mb-2" />
              <p className="font-bold text-slate-800">No urgent interventions required</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                All projects in the active filtered view are progressing within acceptable milestone thresholds.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {interventionsList.map((item) => {
                const currentStatus: 'OPEN' | 'ESCALATED' | 'COMPLETED' =
                  interventionStatuses[item.projectId] || 'OPEN';

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl p-4 border transition-all shadow-sm flex flex-col justify-between space-y-3 ${
                      currentStatus === 'COMPLETED'
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : item.riskLevel === 'HIGH'
                        ? 'bg-red-50/20 border-red-200 hover:border-red-300'
                        : item.riskLevel === 'MEDIUM'
                        ? 'bg-amber-50/20 border-amber-200 hover:border-amber-300'
                        : 'bg-emerald-50/20 border-emerald-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          onClick={() => navigateToProject(item.projectId)}
                          className="font-bold text-xs text-[#0F172A] line-clamp-1 hover:text-blue-600 cursor-pointer"
                          title={item.projectName}
                        >
                          {item.projectName}
                        </h4>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                            item.riskLevel === 'HIGH'
                              ? 'bg-red-100 text-[#DC2626] border border-red-200'
                              : item.riskLevel === 'MEDIUM'
                              ? 'bg-amber-100 text-[#D97706] border border-amber-200'
                              : 'bg-emerald-100 text-[#059669] border border-emerald-200'
                          }`}
                        >
                          {item.riskLevel} RISK
                        </span>
                      </div>

                      <div className="text-[11px] text-[#64748B] flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#94A3B8]" />
                          <span>{item.district}</span>
                        </span>
                        <span>•</span>
                        <span className="font-mono font-bold text-[#2563EB]">{item.projectId}</span>
                        <span>•</span>
                        <span>Acq Progress: <strong className="font-mono text-slate-800">{formatAcquisitionProgress(item.progress)}</strong></span>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-slate-100 pt-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#64748B] tracking-wider block">
                          Issue
                        </span>
                        <p className="text-[11px] font-semibold text-slate-800 leading-snug mt-0.5">
                          {item.mainIssue}
                        </p>
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-lg border border-slate-200/80">
                        <span className="text-[10px] font-bold uppercase text-[#2563EB] tracking-wider block">
                          Recommended Action
                        </span>
                        <p className="text-[11px] text-slate-700 mt-0.5 leading-relaxed font-medium">
                          {item.recommendedAction}
                        </p>
                      </div>
                    </div>

                    {/* Status & Actions Section */}
                    <div className="pt-2 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-600">Status:</span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              currentStatus === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : currentStatus === 'ESCALATED'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {currentStatus}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400">
                            {item.delayDays > 0 ? `${item.delayDays} delay days` : 'On schedule'}
                          </span>
                          <button
                            onClick={() => navigateToProject(item.projectId)}
                            className="text-[#2563EB] text-[11px] font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons: [ Escalate ] [ Mark as Completed ] */}
                      <div className="flex items-center gap-2 pt-1">
                        {currentStatus === 'COMPLETED' ? (
                          <div className="w-full py-1.5 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Completed — No further action required</span>
                          </div>
                        ) : (
                          <>
                            {currentStatus === 'OPEN' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  escalateIntervention(item.projectId, item.projectName);
                                }}
                                className="flex-1 py-1.5 px-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                                title="Escalate to State Monitoring Directorate"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Escalate</span>
                              </button>
                            ) : (
                              <button
                                disabled
                                className="flex-1 py-1.5 px-2.5 bg-slate-100 text-slate-400 border border-slate-200 font-bold text-xs rounded-lg cursor-not-allowed flex items-center justify-center gap-1"
                                title="Already escalated to State Monitoring Directorate"
                              >
                                <span>Escalated ✓</span>
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                completeIntervention(item.projectId, item.projectName);
                              }}
                              className="flex-1 py-1.5 px-2.5 bg-[#059669] hover:bg-[#047857] active:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                              title="Mark this intervention as completed"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark as Completed</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
