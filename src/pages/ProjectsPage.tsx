import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Project, RiskLevel, Stage } from '../types';
import {
  Search,
  Filter,
  ArrowUpDown,
  MapPin,
  Calendar,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Coins,
  Upload,
} from 'lucide-react';
import { formatAcquisitionProgress } from '../utils/acquisitionProgress';

export const ProjectsPage: React.FC = () => {
  const {
    projects,
    navigateToProject,
    setIsCsvModalOpen,
    availableDistricts,
    selectedDistrict,
    setSelectedDistrict,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('highest-risk');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const statuses = useMemo(() => {
    const list = Array.from(new Set(projects.map((p) => p.status || p.currentStage))).filter(Boolean).sort();
    return ['All', ...list];
  }, [projects]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDistrict('All');
    setSelectedRisk('All');
    setSelectedStatus('All');
    setSortBy('highest-risk');
    setCurrentPage(1);
  };

  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        // Search filter (Project ID, Name, District)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchId = p.id?.toLowerCase().includes(q) || p.projectId?.toLowerCase().includes(q);
          const matchName = p.name?.toLowerCase().includes(q) || p.projectName?.toLowerCase().includes(q);
          const matchDist = p.district?.toLowerCase().includes(q);
          if (!matchId && !matchName && !matchDist) return false;
        }

        // District Filter: bypass completely if 'All' or 'ALL'
        const normDist = selectedDistrict ? selectedDistrict.trim().toUpperCase() : 'ALL';
        if (normDist !== 'ALL' && normDist !== 'ALL DISTRICTS' && normDist !== 'ALL_DISTRICTS') {
          if (!p.district || p.district.trim().toLowerCase() !== selectedDistrict.trim().toLowerCase()) {
            return false;
          }
        }

        // Risk Filter (HIGH, MEDIUM, LOW, NOT_ASSESSED)
        if (selectedRisk !== 'All') {
          const normSelected = selectedRisk.toUpperCase().replace(/\s+/g, '_');
          const pRisk = (p.riskLevel || 'NOT_ASSESSED').toUpperCase().replace(/\s+/g, '_');
          if (normSelected === 'HIGH') {
            if (pRisk !== 'HIGH' && pRisk !== 'CRITICAL') return false;
          } else if (normSelected === 'MEDIUM') {
            if (pRisk !== 'MEDIUM') return false;
          } else if (normSelected === 'LOW') {
            if (pRisk !== 'LOW') return false;
          } else if (normSelected === 'NOT_ASSESSED') {
            if (pRisk !== 'NOT_ASSESSED') return false;
          }
        }

        // Status Filter
        if (selectedStatus !== 'All' && (p.status !== selectedStatus && p.currentStage !== selectedStatus)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'highest-risk') return (b.riskScore || 0) - (a.riskScore || 0);
        if (sortBy === 'lowest-risk') return (a.riskScore || 0) - (b.riskScore || 0);
        if (sortBy === 'highest-progress') {
          const aP = a.acquisitionProgress !== null && a.acquisitionProgress !== undefined ? a.acquisitionProgress : -1;
          const bP = b.acquisitionProgress !== null && b.acquisitionProgress !== undefined ? b.acquisitionProgress : -1;
          return bP - aP;
        }
        if (sortBy === 'lowest-progress') {
          const aP = a.acquisitionProgress !== null && a.acquisitionProgress !== undefined ? a.acquisitionProgress : 999;
          const bP = b.acquisitionProgress !== null && b.acquisitionProgress !== undefined ? b.acquisitionProgress : 999;
          return aP - bP;
        }
        if (sortBy === 'highest-comp') return (b.compensation || 0) - (a.compensation || 0);
        if (sortBy === 'land-required') return (b.landRequired || 0) - (a.landRequired || 0);
        return 0;
      });
  }, [projects, searchQuery, selectedDistrict, selectedRisk, selectedStatus, sortBy]);

  // Paginated Slicing
  const totalItems = filteredProjects.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredProjects.slice(startIndex, startIndex + pageSize);
  }, [filteredProjects, currentPage, pageSize]);

  const formatCurrency = (val: number) => {
    if (val === 0) return '₹ 0';
    if (val >= 10000000) return `₹ ${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹ ${(val / 100000).toFixed(2)} L`;
    if (val >= 1000) return `₹ ${val.toLocaleString('en-IN')}`;
    return `₹ ${val.toFixed(0)}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-heading">
            Land Acquisition Projects Table
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, filter, sort, and inspect project acquisition milestones, compensation disbursement, and delay risks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV</span>
          </button>
          <button
            onClick={resetFilters}
            className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Matrix */}
      <div className="bg-white rounded-xl p-5 border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.06)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F2747] uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#2563EB]" />
            <span>Filter Criteria</span>
          </div>
          <span className="text-xs font-mono text-[#64748B]">
            Showing <strong className="text-[#0F172A]">{totalItems}</strong> of <strong className="text-[#0F172A]">{projects.length}</strong> Projects
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Project ID, Name, District..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] bg-white text-[#0F172A]"
              />
            </div>
          </div>

          {/* District Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
              District
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] bg-white text-[#0F172A] font-medium"
            >
              {availableDistricts.map((d) => (
                <option key={d} value={d}>
                  {d === 'All' ? 'All Districts' : d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
              Status / Stage
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] bg-white text-[#0F172A] font-medium"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All Statuses' : s}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
              Risk Level
            </label>
            <select
              value={selectedRisk}
              onChange={(e) => {
                setSelectedRisk(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] bg-white text-[#0F172A] font-medium"
            >
              <option value="All">All Risk Levels</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>

          {/* Sorting */}
          <div>
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] bg-white text-[#0F172A] font-medium"
            >
              <option value="highest-risk">Highest Delay Risk (%)</option>
              <option value="lowest-risk">Lowest Delay Risk (%)</option>
              <option value="highest-progress">Highest Progress (%)</option>
              <option value="lowest-progress">Lowest Progress (%)</option>
              <option value="highest-comp">Highest Compensation</option>
              <option value="land-required">Land Required (Area)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#475569] font-bold uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3.5 px-4">Project ID</th>
                <th className="py-3.5 px-4">Project Name</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Sector</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Acquisition Progress</th>
                <th className="py-3.5 px-4">Risk</th>
                <th className="py-3.5 px-4">Risk Score</th>
                <th className="py-3.5 px-4">Risk Factors</th>
                <th className="py-3.5 px-4">Last Updated</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {paginatedProjects.length > 0 ? (
                paginatedProjects.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigateToProject(p.id)}
                    className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB]">
                      {p.id || p.projectId}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#0F172A]">{p.name || p.projectName}</div>
                      <div className="text-[11px] text-[#64748B]">{p.projectType || p.subSector}</div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-[#475569]">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span>{p.district}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#475569] font-medium">
                      <span className="inline-block max-w-[140px] truncate" title={p.sector || p.projectType}>
                        {p.sector || p.projectType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#F1F5F9] text-[#0F2747] border border-[#E2E8F0]">
                        {p.status || p.currentStage}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {p.acquisitionProgress !== null && p.acquisitionProgress !== undefined ? (
                          <>
                            <span className="font-mono font-bold text-slate-800 text-xs">
                              {p.acquisitionProgress}%
                            </span>
                            <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="bg-blue-600 h-full rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, p.acquisitionProgress))}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium italic">
                            Not Available
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Risk Badge with exact colors: HIGH #DC2626, MEDIUM #D97706, LOW #059669 */}
                    <td className="py-3.5 px-4">
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

                    {/* Risk Score */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <span className="text-sm">{p.riskScore ?? 0}</span>
                      <span className="text-[10px] text-slate-400 font-normal"> / 100</span>
                    </td>

                    {/* Risk Factors cleanly rendered without raw JSON */}
                    <td className="py-3.5 px-4 max-w-xs">
                      {p.riskFactors && p.riskFactors.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {p.riskFactors.slice(0, 2).map((factor, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate inline-block"
                              title={factor}
                            >
                              • {factor}
                            </span>
                          ))}
                          {p.riskFactors.length > 2 && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              +{p.riskFactors.length - 2} more signals
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Routine monitoring</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-[11px] text-slate-500 font-mono">
                      {p.lastUpdated}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToProject(p.id);
                        }}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded-lg border border-blue-200 transition-all inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No land acquisition projects match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="p-1 border border-slate-300 rounded bg-white font-mono"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-400">|</span>
            <span>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} total items)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`p-1.5 rounded-lg border ${
                currentPage === 1
                  ? 'text-slate-300 border-slate-200 cursor-not-allowed bg-slate-100'
                  : 'text-slate-700 border-slate-300 hover:bg-slate-200 bg-white'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`p-1.5 rounded-lg border ${
                currentPage === totalPages
                  ? 'text-slate-300 border-slate-200 cursor-not-allowed bg-slate-100'
                  : 'text-slate-700 border-slate-300 hover:bg-slate-200 bg-white'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
