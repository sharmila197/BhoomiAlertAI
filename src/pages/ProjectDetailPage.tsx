import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { RiskGauge } from '../components/common/RiskGauge';
import { ShapBreakdown } from '../components/common/ShapBreakdown';
import { LifecycleTimeline } from '../components/common/LifecycleTimeline';
import { StageWiseRiskAssessment } from '../components/common/StageWiseRiskAssessment';
import { Stage, Project } from '../types';
import { formatAcquisitionProgress } from '../utils/acquisitionProgress';
import {
  MapPin,
  Calendar,
  Layers,
  Users,
  Maximize2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  PlusCircle,
  Clock,
  Building,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Shield,
  Coins,
  Map,
  Check,
  Globe,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

export const ProjectDetailPage: React.FC = () => {
  const {
    currentProject,
    projects,
    setActiveProjectId,
    updateProjectData,
    addIntervention,
    setActiveTab,
    interventions,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'update' | 'interventions'>('overview');

  // Edit form state initialized with current project values
  const [docProgress, setDocProgress] = useState(currentProject?.documentationProgress || 75);
  const [approvalProg, setApprovalProg] = useState(currentProject?.approvalProgress || 70);
  const [compProgress, setCompProgress] = useState(currentProject?.compensationProgress || 50);
  const [legalCases, setLegalCases] = useState(currentProject?.legalDisputes || 0);
  const [rrProg, setRrProg] = useState(currentProject?.rrProgress || 65);
  const [stakeholderResp, setStakeholderResp] = useState(currentProject?.stakeholderResponsiveness || 70);
  const [currStage, setCurrStage] = useState<Stage>(currentProject?.currentStage || 'Compensation');

  // Intervention Modal
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [intervAction, setIntervAction] = useState('');
  const [intervDept, setIntervDept] = useState('Special DRO (Land Acquisition)');
  const [intervOfficer, setIntervOfficer] = useState('Revenue Inspector & Tehsildar');
  const [intervDeadline, setIntervDeadline] = useState('15-09-2026');
  const [intervPriority, setIntervPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('Critical');

  // Sync edit form state whenever active project changes
  useEffect(() => {
    if (currentProject) {
      setDocProgress(currentProject.documentationProgress);
      setApprovalProg(currentProject.approvalProgress);
      setCompProgress(currentProject.compensationProgress);
      setLegalCases(currentProject.legalDisputes);
      setRrProg(currentProject.rrProgress);
      setStakeholderResp(currentProject.stakeholderResponsiveness);
      setCurrStage(currentProject.currentStage);
    }
  }, [currentProject]);

  if (!currentProject) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4 my-8">
        <h3 className="text-base font-bold text-slate-800">No project selected.</h3>
        <p className="text-xs text-slate-500">Please select or upload projects to inspect.</p>
        <button
          onClick={() => setActiveTab('dashboard')}
          className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleRunAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    updateProjectData(
      currentProject.id,
      {
        documentationProgress: Number(docProgress),
        approvalProgress: Number(approvalProg),
        compensationProgress: Number(compProgress),
        legalDisputes: Number(legalCases),
        rrProgress: Number(rrProg),
        stakeholderResponsiveness: Number(stakeholderResp),
        currentStage: currStage,
      },
      `Administrative Progress Update: Comp ${compProgress}%, Disputes: ${legalCases}`
    );
    setActiveSubTab('overview');
  };

  const handleCreateIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intervAction.trim()) return;

    addIntervention({
      projectId: currentProject.id,
      projectName: currentProject.name,
      action: intervAction,
      priority: intervPriority,
      department: intervDept,
      assignedTo: intervOfficer,
      deadline: intervDeadline,
      status: 'In Progress',
      notes: `Generated from Project AI Analysis for ${currentProject.id}`,
    });

    setShowInterventionModal(false);
    setIntervAction('');
  };

  const projectInterventions = interventions.filter(
    (i) => i.projectId === currentProject.id
  );

  const formatCurrency = (val: number) => {
    if (!val || val === 0) return '₹ 0';
    if (val >= 10000000) return `₹ ${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹ ${(val / 100000).toFixed(2)} L`;
    if (val >= 1000) return `₹ ${val.toLocaleString('en-IN')}`;
    return `₹ ${val.toFixed(0)}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Project Switcher Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto max-w-2xl py-0.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex-shrink-0">
            Select Project:
          </span>
          <div className="flex items-center gap-2">
            <select
              value={currentProject.id}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="p-1.5 px-3 border border-slate-300 rounded-lg bg-slate-50 font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.name} ({p.district})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('gis-map')}
          className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
        >
          <Map className="w-4 h-4 text-blue-600" />
          <span>Locate on GIS Map</span>
        </button>
      </div>

      {/* Main Project Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                {currentProject.id}
              </span>
              <span
                style={{
                  backgroundColor:
                    currentProject.riskLevel === 'HIGH'
                      ? '#DC2626'
                      : currentProject.riskLevel === 'MEDIUM'
                      ? '#D97706'
                      : '#059669',
                }}
                className="px-3 py-0.5 rounded-full text-xs font-extrabold tracking-wider uppercase text-white shadow-xs"
              >
                {currentProject.riskLevel} RISK • {currentProject.riskScore} MONITORING SCORE
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-heading">
              {currentProject.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-2">
              <span className="flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {currentProject.district}
                {currentProject.taluk ? `, ${currentProject.taluk}` : ''}
                {currentProject.village ? `, ${currentProject.village}` : ''}
              </span>
              <span>•</span>
              <span className="font-semibold text-slate-800">
                {currentProject.subSector || currentProject.projectType}
              </span>
              <span>•</span>
              <span className="text-slate-500 font-mono">
                Updated: {currentProject.lastUpdated}
              </span>
            </div>
          </div>

          {/* Key Metrics Quick Bar (Available PPPIN fields) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Status / Stage
              </div>
              <div className="text-sm font-extrabold text-blue-800 mt-0.5">
                {currentProject.status || currentProject.currentStage}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Acquisition Progress
              </div>
              <div className="text-sm font-extrabold text-slate-800 font-mono mt-0.5">
                {formatAcquisitionProgress(currentProject.acquisitionProgress)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Total Project Cost
              </div>
              <div className="text-sm font-extrabold text-slate-800 font-mono mt-0.5">
                ₹ {currentProject.totalProjectCost || currentProject.estimatedCostCr || 0} Cr
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Date of Award
              </div>
              <div className="text-sm font-extrabold text-slate-800 font-mono mt-0.5">
                {currentProject.awardDate || currentProject.dateOfAward || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Project Authority
              </div>
              <div className="text-sm font-extrabold text-slate-800 mt-0.5 truncate" title={currentProject.projectAuthority || currentProject.authority}>
                {currentProject.projectAuthority || currentProject.authority || 'State Directorate'}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed PPPIN Metadata Grid (Requirement 12) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mt-5 pt-4 border-t border-slate-100 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Sector</span>
            <span className="font-bold text-slate-800 truncate block">{currentProject.sector || 'Infrastructure'}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Sub-Sector</span>
            <span className="font-bold text-blue-700 truncate block" title={currentProject.subSector || currentProject.projectType}>
              {currentProject.subSector || currentProject.projectType}
            </span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Concession Model</span>
            <span className="font-bold text-slate-800 truncate block">{currentProject.pppModel || 'PPP Concession'}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Acquisition Progress</span>
            <span className="font-bold text-slate-800 font-mono block">
              {formatAcquisitionProgress(currentProject.acquisitionProgress)}
            </span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Award Date</span>
            <span className="font-bold text-slate-800 font-mono">{currentProject.awardDate || currentProject.dateOfAward || 'N/A'}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Update Date</span>
            <span className="font-bold text-emerald-700 font-mono">{currentProject.lastUpdated}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">GIS Coordinates</span>
            <span className="font-bold text-slate-700 font-mono">
              {currentProject.coordinates
                ? `${currentProject.coordinates.lat.toFixed(4)}, ${currentProject.coordinates.lng.toFixed(4)}`
                : 'Location unavailable'}
            </span>
          </div>
        </div>

        {/* Tab switcher within details */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === 'overview'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            AI Risk Assessment & SHAP
          </button>
          <button
            onClick={() => setActiveSubTab('update')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'update'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Update Project Data & Recalculate</span>
          </button>
          <button
            onClick={() => setActiveSubTab('interventions')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'interventions'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Interventions ({projectInterventions.length})</span>
          </button>
        </div>
      </div>

      {/* Horizontal Lifecycle Timeline */}
      <LifecycleTimeline currentStage={currentProject.currentStage} />

      {activeSubTab === 'overview' && (
        <>
          {/* Professional Stage-Wise Delay Risk Assessment (Planning, Land Acquisition, Compensation) */}
          <StageWiseRiskAssessment
            project={currentProject}
            onNavigateToUpdate={() => setActiveSubTab('update')}
          />

          {/* Main Grid: AI Risk Assessment Card + SHAP Explanation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left AI Risk Assessment Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Project Monitoring Risk
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Rule-based monitoring score
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      backgroundColor:
                        currentProject.riskLevel === 'HIGH'
                          ? '#DC2626'
                          : currentProject.riskLevel === 'MEDIUM'
                          ? '#D97706'
                          : '#059669',
                    }}
                    className="text-[10px] font-bold px-2.5 py-1 text-white rounded font-mono uppercase"
                  >
                    {currentProject.riskLevel}
                  </span>
                </div>

                {/* Risk Gauge Visual */}
                <div className="my-4">
                  <RiskGauge
                    probability={currentProject.riskScore}
                    riskLevel={currentProject.riskLevel}
                    size="lg"
                  />
                </div>

                {/* Triggered Risk Factors */}
                <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 mt-4 space-y-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Triggered Risk Factors</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {currentProject.riskFactors?.length || 0} active
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {currentProject.riskFactors && currentProject.riskFactors.length > 0 ? (
                      currentProject.riskFactors.map((factor, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-blue-600 font-bold mt-0.5">•</span>
                          <span>{factor}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400 italic">No elevated monitoring signals detected.</li>
                    )}
                  </ul>
                </div>

                {/* AI Explanation */}
                <div className="bg-blue-50/70 rounded-lg p-3.5 border border-blue-200 mt-3">
                  <div className="text-xs font-bold text-blue-900 mb-1">
                    AI Monitoring Explanation
                  </div>
                  <p className="text-xs text-blue-950 leading-relaxed">
                    “{currentProject.explanation}”
                  </p>
                </div>

                {/* Recommended Action */}
                <div className="bg-emerald-50/70 rounded-lg p-3.5 border border-emerald-200 mt-3">
                  <div className="text-xs font-bold text-emerald-900 mb-1">
                    Recommended Action
                  </div>
                  <p className="text-xs text-emerald-950 leading-relaxed">
                    {currentProject.recommendation || 'Continue routine monitoring and periodic data updates.'}
                  </p>
                </div>
              </div>

              {/* Action Trigger Buttons */}
              <div className="pt-4 border-t border-slate-100 space-y-2 mt-4">
                <button
                  onClick={() => setShowInterventionModal(true)}
                  className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Issue Administrative Intervention</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('update')}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Simulate Parameter Changes</span>
                </button>
              </div>
            </div>

            {/* Right: SHAP Explainable AI Section */}
            <div className="lg:col-span-2">
              <ShapBreakdown
                contributions={currentProject.shapContributions}
                projectId={currentProject.id}
                projectName={currentProject.name}
                explanation={currentProject.explanation}
              />
            </div>
          </div>

          {/* Recommended Next Actions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Recommended Next Actions
                    <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      Prescriptive Matrix
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Prioritized administrative prescriptions based on identified project risk factors.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowInterventionModal(true)}
                className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Custom Order</span>
              </button>
            </div>

            <div className="p-5 divide-y divide-slate-100 space-y-4">
              {currentProject.recommendations.map((rec, index) => (
                <div
                  key={rec.id || index}
                  className="pt-4 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          rec.priority === 'Critical'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : rec.priority === 'High'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        Priority {index + 1} — {rec.priority}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        {rec.title}
                      </h4>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {rec.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        Dept: <strong>{rec.department}</strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Suggested Deadline: <strong>{rec.suggestedDeadline}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        addIntervention({
                          projectId: currentProject.id,
                          projectName: currentProject.name,
                          action: rec.title,
                          priority: rec.priority,
                          department: rec.department,
                          assignedTo: 'Special DRO & Tehsildar',
                          deadline: rec.suggestedDeadline,
                          status: 'In Progress',
                          notes: rec.description,
                        });
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-all flex items-center gap-1 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Convert to Intervention</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Tab: Update Project Data & Recalculate */}
      {activeSubTab === 'update' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Update Project Indicators & Recalculate Risk
              </h3>
              <p className="text-xs text-slate-500">
                Modify field progress indicators to assess how milestone execution directly lowers project delay risk.
              </p>
            </div>
          </div>

          <form onSubmit={handleRunAssessment} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Compensation Progress */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Compensation Progress (%)
                  </label>
                  <span className="font-mono font-extrabold text-blue-700 text-sm">
                    {compProgress}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={compProgress}
                  onChange={(e) => setCompProgress(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Legal Dispute Cases */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Legal Dispute Cases (Count)
                  </label>
                  <span className="font-mono font-extrabold text-red-600 text-sm">
                    {legalCases} cases
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={legalCases}
                  onChange={(e) => setLegalCases(Number(e.target.value))}
                  className="w-full p-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white"
                />
              </div>

              {/* Approval Progress */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Approval Progress (%)
                  </label>
                  <span className="font-mono font-extrabold text-blue-700 text-sm">
                    {approvalProg}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={approvalProg}
                  onChange={(e) => setApprovalProg(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Documentation Progress */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Documentation Progress (%)
                  </label>
                  <span className="font-mono font-extrabold text-blue-700 text-sm">
                    {docProgress}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={docProgress}
                  onChange={(e) => setDocProgress(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* R&R Progress */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    R&R Progress (%)
                  </label>
                  <span className="font-mono font-extrabold text-blue-700 text-sm">
                    {rrProg}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={rrProg}
                  onChange={(e) => setRrProg(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Stakeholder Responsiveness */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Stakeholder Responsiveness (%)
                  </label>
                  <span className="font-mono font-extrabold text-blue-700 text-sm">
                    {stakeholderResp}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={stakeholderResp}
                  onChange={(e) => setStakeholderResp(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Current Stage Selector */}
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Statutory Lifecycle Stage
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  'Planning',
                  'Notification',
                  'Documentation',
                  'Approval',
                  'Compensation',
                  'Legal / R&R',
                  'Possession',
                  'Completed',
                ].map((stg) => (
                  <button
                    key={stg}
                    type="button"
                    onClick={() => setCurrStage(stg as Stage)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      currStage === stg
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {stg}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveSubTab('overview')}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Recalculate Risk</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Project Interventions */}
      {activeSubTab === 'interventions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Active Interventions for {currentProject.id}
              </h3>
              <p className="text-xs text-slate-500">
                Tracked administrative orders assigned to resolve project bottlenecks.
              </p>
            </div>
            <button
              onClick={() => setShowInterventionModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Intervention</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {projectInterventions.length > 0 ? (
              projectInterventions.map((item) => (
                <div key={item.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700">
                        {item.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          item.priority === 'Critical'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.priority}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          item.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">
                      {item.action}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Assigned To: <strong>{item.assignedTo}</strong> ({item.department}) • Deadline: <strong>{item.deadline}</strong>
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                No interventions recorded yet for this project.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Intervention Modal */}
      {showInterventionModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Issue Administrative Intervention Order
                </h3>
              </div>
              <button
                onClick={() => setShowInterventionModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIntervention} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Intervention Action Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Lok Adalat for Parcel 44/2"
                  value={intervAction}
                  onChange={(e) => setIntervAction(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={intervPriority}
                    onChange={(e: any) => setIntervPriority(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="Critical">Critical (Immediate)</option>
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Compliance Deadline
                  </label>
                  <input
                    type="text"
                    required
                    value={intervDeadline}
                    onChange={(e) => setIntervDeadline(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Department
                </label>
                <input
                  type="text"
                  required
                  value={intervDept}
                  onChange={(e) => setIntervDept(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Officer / Revenue Authority
                </label>
                <input
                  type="text"
                  required
                  value={intervOfficer}
                  onChange={(e) => setIntervOfficer(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInterventionModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Issue Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
