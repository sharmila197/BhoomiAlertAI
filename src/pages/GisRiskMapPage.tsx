import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  Map as MapIcon,
  Filter,
  MapPin,
  ArrowRight,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { Project } from '../types';
import { formatAcquisitionProgress } from '../utils/acquisitionProgress';

// Custom SVG-based Leaflet DivIcon for crisp, reliable rendering
const createCustomIcon = (riskLevel: string, prob: number | null) => {
  const isUnassessed = riskLevel === 'NOT ASSESSED' || prob === null;
  const color =
    isUnassessed
      ? '#64748b'
      : riskLevel === 'CRITICAL'
      ? '#991b1b'
      : riskLevel === 'HIGH'
      ? '#dc2626'
      : riskLevel === 'MEDIUM'
      ? '#d97706'
      : '#059669';

  const isHigh = riskLevel === 'HIGH' || riskLevel === 'CRITICAL';
  const label = isUnassessed ? 'PPP' : `${prob}%`;

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer group">
      ${
        isHigh
          ? `<div class="absolute w-8 h-8 rounded-full bg-red-500/30 animate-ping"></div>`
          : ''
      }
      <div class="w-8 h-8 rounded-full bg-slate-900 border-2 border-white shadow-xl flex items-center justify-center text-white font-mono font-black text-[9px]" style="box-shadow: 0 0 10px ${color}">
        <span style="color: ${color}">${label}</span>
      </div>
      <div class="absolute -bottom-1 w-2 h-2 rotate-45 bg-slate-900 border-r border-b border-white"></div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-gis-marker',
    html: html,
    iconSize: [32, 38],
    iconAnchor: [16, 38],
    popupAnchor: [0, -38],
  });
};

export const GisRiskMapPage: React.FC = () => {
  const {
    projects,
    navigateToProject,
    availableDistricts,
    selectedDistrict,
    setSelectedDistrict,
    setIsCsvModalOpen,
  } = useApp();

  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('All');
  const [activeMapProject, setActiveMapProject] = useState<Project | null>(null);

  // Filter projects by district and risk
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const normDist = selectedDistrict ? selectedDistrict.trim().toUpperCase() : 'ALL';
      if (normDist !== 'ALL' && normDist !== 'ALL DISTRICTS' && normDist !== 'ALL_DISTRICTS') {
        if (!p.district || p.district.trim().toLowerCase() !== selectedDistrict.trim().toLowerCase()) {
          return false;
        }
      }
      if (selectedRiskFilter !== 'All') {
        const normSelected = selectedRiskFilter.toUpperCase().replace(/\s+/g, '_');
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
      return true;
    });
  }, [projects, selectedDistrict, selectedRiskFilter]);

  // Projects with valid coordinates only (DO NOT CREATE FAKE MARKERS)
  const mapProjects = useMemo(() => {
    return filteredProjects.filter(
      (p) => p.coordinates && typeof p.coordinates.lat === 'number' && typeof p.coordinates.lng === 'number'
    );
  }, [filteredProjects]);

  const projectsWithoutCoordsCount = filteredProjects.length - mapProjects.length;

  const formatCurrency = (val: number) => {
    if (val === 0) return '₹ 0';
    if (val >= 10000000) return `₹ ${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹ ${(val / 100000).toFixed(2)} L`;
    if (val >= 1000) return `₹ ${val.toLocaleString('en-IN')}`;
    return `₹ ${val.toFixed(0)}`;
  };

  // Center coordinates calculation
  const mapCenter: [number, number] = useMemo(() => {
    if (mapProjects.length > 0 && mapProjects[0].coordinates) {
      return [mapProjects[0].coordinates.lat, mapProjects[0].coordinates.lng];
    }
    return [11.1271, 78.6569]; // Default Tamil Nadu center
  }, [mapProjects]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              <MapIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                BhoomiAlert AI — Spatial GIS Risk Map
              </h1>
              <p className="text-xs text-slate-500">
                Geospatial distribution of land acquisition parcels and early risk clustering across Tamil Nadu.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV</span>
          </button>
        </div>
      </div>

      {/* Map + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side Filter Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <span>Map Layers & Filters</span>
              </span>
              <span className="text-xs font-mono font-bold text-blue-700">
                {mapProjects.length} Pins
              </span>
            </div>

            {/* Risk Level Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Filter by Risk
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {['All', 'HIGH', 'MEDIUM', 'LOW'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRiskFilter(r)}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all ${
                      selectedRiskFilter === r
                        ? r === 'HIGH'
                          ? 'bg-red-600 text-white border-red-700'
                          : r === 'MEDIUM'
                          ? 'bg-amber-600 text-white border-amber-700'
                          : r === 'LOW'
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-blue-600 text-white border-blue-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {r === 'All' ? 'All Risks' : `${r} Risk`}
                  </button>
                ))}
              </div>
            </div>

            {/* District Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Filter by District
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-slate-50 font-medium"
              >
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d === 'All' ? 'All Districts' : d}
                  </option>
                ))}
              </select>
            </div>

            {/* Missing Coordinates Notification */}
            {projectsWithoutCoordsCount > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <span>
                  {projectsWithoutCoordsCount} project(s) do not have valid latitude/longitude coordinates and are not plotted.
                </span>
              </div>
            )}

            {/* Plotted Projects List */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                Plotted Projects on Map ({mapProjects.length})
              </label>
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg bg-slate-50">
                {mapProjects.length > 0 ? (
                  mapProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setActiveMapProject(p)}
                      className={`w-full p-2 text-left hover:bg-blue-50 transition-colors flex items-center justify-between text-xs ${
                        activeMapProject?.id === p.id ? 'bg-blue-100 font-bold' : ''
                      }`}
                    >
                      <div className="min-w-0 pr-1">
                        <div className="font-mono text-blue-700 font-bold">
                          {p.id}
                        </div>
                        <div className="text-[11px] text-slate-700 truncate max-w-[130px]">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Acq: {formatAcquisitionProgress(p.acquisitionProgress)}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                          p.hasRiskAssessment && p.riskScore !== null
                            ? p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH' || p.riskScore >= 70
                              ? 'bg-red-100 text-red-800'
                              : p.riskLevel === 'MEDIUM' || p.riskScore >= 40
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {p.hasRiskAssessment && p.riskScore !== null ? `${p.riskScore}%` : 'PENDING'}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No projects with valid GIS coordinates match the filter.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Map Legend */}
          <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
            <span className="font-bold text-slate-700 block">GIS Risk Legend:</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600 ring-2 ring-red-200" />
              <span className="text-slate-600 font-medium">HIGH / CRITICAL Risk (≥ 70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-200" />
              <span className="text-slate-600 font-medium">MEDIUM Risk (40–69%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600 ring-2 ring-emerald-200" />
              <span className="text-slate-600 font-medium">LOW Risk (&lt; 40%)</span>
            </div>
          </div>
        </div>

        {/* GIS Map View */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[600px] relative z-10">
          <MapContainer
            center={mapCenter}
            zoom={7}
            scrollWheelZoom={true}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {mapProjects.map((p) => {
              if (!p.coordinates) return null;

              return (
                <Marker
                  key={p.id}
                  position={[p.coordinates.lat, p.coordinates.lng]}
                  icon={createCustomIcon(p.riskLevel, p.riskScore)}
                >
                  <Popup className="custom-popup">
                    <div className="p-1 max-w-xs space-y-2 text-slate-900 font-sans">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <span className="font-mono font-bold text-xs text-blue-700">
                          {p.id}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                            p.hasRiskAssessment && p.riskScore !== null
                              ? p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH' || p.riskScore >= 70
                                ? 'bg-red-100 text-red-800'
                                : p.riskLevel === 'MEDIUM' || p.riskScore >= 40
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}
                        >
                          {p.hasRiskAssessment && p.riskScore !== null
                            ? `${p.riskScore}% ${p.riskLevel}`
                            : 'NOT ASSESSED'}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {p.name}
                      </h4>

                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div>
                          District: <strong>{p.district}</strong>
                        </div>
                        <div>
                          Status: <strong>{p.status || p.currentStage}</strong>
                        </div>
                        <div>
                          Acquisition Progress:{' '}
                          <strong>
                            {formatAcquisitionProgress(p.acquisitionProgress)}
                          </strong>
                        </div>
                        <div>
                          {p.hasRiskAssessment && p.compensation ? (
                            <span>Compensation: <strong>{formatCurrency(p.compensation)}</strong></span>
                          ) : p.estimatedCostCr ? (
                            <span>Estimated PPP Cost: <strong>₹ {p.estimatedCostCr} Cr</strong></span>
                          ) : (
                            <span>Data: <strong>Awaiting Land CSV</strong></span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <button
                          onClick={() => navigateToProject(p.id)}
                          className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-xs flex items-center justify-center gap-1 transition-colors"
                        >
                          <span>View Project Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};
