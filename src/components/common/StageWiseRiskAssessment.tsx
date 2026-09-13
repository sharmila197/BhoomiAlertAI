import React, { useState, useEffect } from 'react';
import { Project, ProjectStageRiskResponse, StageRiskAssessment } from '../../types';
import { calculateStageWiseRisk } from '../../utils/stageRiskEngine';
import {
  Compass,
  MapPin,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface StageWiseRiskAssessmentProps {
  project: Project;
  onNavigateToUpdate?: () => void;
}

export const StageWiseRiskAssessment: React.FC<StageWiseRiskAssessmentProps> = ({
  project,
  onNavigateToUpdate,
}) => {
  const [stageRiskData, setStageRiskData] = useState<ProjectStageRiskResponse>(() => {
    return project.stageRisk || calculateStageWiseRisk(project);
  });
  const [expandedShapStage, setExpandedShapStage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Attempt live API fetch for /api/projects/:id/stage-risk, fall back smoothly to engine result
  useEffect(() => {
    let isMounted = true;
    const fetchStageRiskFromApi = async () => {
      try {
        setIsLoading(true);
        const projectId = project.projectId || project.id;
        const res = await fetch(`/api/projects/${projectId}/stage-risk`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setStageRiskData(data);
          }
        } else {
          // Calculate client-side if API fails or for offline/CSV projects
          if (isMounted) {
            setStageRiskData(project.stageRisk || calculateStageWiseRisk(project));
          }
        }
      } catch (e) {
        if (isMounted) {
          setStageRiskData(project.stageRisk || calculateStageWiseRisk(project));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchStageRiskFromApi();
    return () => {
      isMounted = false;
    };
  }, [project.id, project.projectId, project.lastUpdated]);

  const toggleShap = (stageKey: string) => {
    setExpandedShapStage((prev) => (prev === stageKey ? null : stageKey));
  };

  const stages: {
    key: 'planning' | 'landAcquisition' | 'compensation';
    title: string;
    stageNumber: number;
    icon: React.ComponentType<{ className?: string }>;
    data: StageRiskAssessment;
    accentColor: string;
  }[] = [
    {
      key: 'planning',
      title: 'Planning Stage',
      stageNumber: 1,
      icon: Compass,
      data: stageRiskData.planning,
      accentColor: 'blue',
    },
    {
      key: 'landAcquisition',
      title: 'Land Acquisition Stage',
      stageNumber: 2,
      icon: MapPin,
      data: stageRiskData.landAcquisition,
      accentColor: 'indigo',
    },
    {
      key: 'compensation',
      title: 'Compensation Stage',
      stageNumber: 3,
      icon: IndianRupee,
      data: stageRiskData.compensation,
      accentColor: 'emerald',
    },
  ];

  const isCompleteCoverage = stageRiskData.overallCoverage === 'COMPLETE';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Header Banner */}
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20 mt-0.5">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Stage-Wise Delay Risk Prediction
                </h3>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider font-mono">
                  BhoomiAlert AI Multi-Stage Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Independent risk prediction across lifecycle stages. Missing stage fields are strictly unassessed without artificial data fabrication.
              </p>
            </div>
          </div>

          {/* Stage Coverage Badge */}
          <div className="flex items-center gap-2 shrink-0">
            {isCompleteCoverage ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Full Stage Coverage (3/3 Assessed)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Partial Stage Coverage ({stageRiskData.assessedCount}/3 Assessed)</span>
              </div>
            )}
          </div>
        </div>

        {/* Incomplete Coverage Guidance Notice */}
        {!isCompleteCoverage && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-950 leading-relaxed">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Incomplete Stage Data Notice:</span> Official PPPIN infrastructure records provide general and financial parameters but omit land-acquisition and compensation progress metrics. Unassessed stages are excluded from risk averaging and are <span className="font-semibold underline decoration-amber-400 underline-offset-2">NEVER</span> treated as low risk. Upload verified departmental records to enable multi-stage prediction.
            </div>
          </div>
        )}
      </div>

      {/* 3 Stage Cards Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const isAssessed = stage.data.status === 'ASSESSED';
          const isExpanded = expandedShapStage === stage.key;
          const riskLevel = stage.data.riskLevel;

          return (
            <div
              key={stage.key}
              className={`rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                isAssessed
                  ? 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                  : 'bg-slate-50/80 border-dashed border-slate-300'
              }`}
            >
              <div>
                {/* Stage Card Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isAssessed
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {stage.stageNumber}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        {stage.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {isAssessed ? 'Active Stage Model' : 'Source Data Unavailable'}
                      </p>
                    </div>
                  </div>

                  {/* Risk Level Badge */}
                  {isAssessed ? (
                    <span
                      style={{
                        backgroundColor:
                          riskLevel === 'HIGH'
                            ? '#DC2626'
                            : riskLevel === 'MEDIUM'
                            ? '#D97706'
                            : '#059669',
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 text-white rounded font-mono uppercase shadow-xs"
                    >
                      {riskLevel}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded font-mono uppercase">
                      NOT ASSESSED
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-4">
                  {/* Metric Display */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Stage Delay Probability
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      {isAssessed && stage.data.delayProbability !== null ? (
                        <>
                          <span
                            className={`text-2xl font-extrabold tracking-tight ${
                              riskLevel === 'HIGH'
                                ? 'text-red-600'
                                : riskLevel === 'MEDIUM'
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {stage.data.delayProbability}%
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            predicted delay risk
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl font-extrabold text-slate-400 tracking-tight">
                            —
                          </span>
                          <span className="text-[11px] text-slate-400 italic">
                            Not Assessed (No Data)
                          </span>
                        </>
                      )}
                    </div>

                    {/* Progress Bar for Assessed Stages */}
                    {isAssessed && stage.data.delayProbability !== null ? (
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            riskLevel === 'HIGH'
                              ? 'bg-red-600'
                              : riskLevel === 'MEDIUM'
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                          }`}
                          style={{ width: `${stage.data.delayProbability}%` }}
                        />
                      </div>
                    ) : (
                      <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-slate-400" />
                        <span>Zero percent is not assigned to missing data</span>
                      </div>
                    )}
                  </div>

                  {/* Key Contributing Factors */}
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-between mb-2">
                      <span>Key Contributing Factors</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {stage.data.factors.length} noted
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {stage.data.factors.map((factor, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-600 flex items-start gap-1.5 leading-snug"
                        >
                          <span
                            className={`font-bold mt-0.5 shrink-0 ${
                              isAssessed ? 'text-blue-600' : 'text-slate-400'
                            }`}
                          >
                            •
                          </span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommended Next Action */}
                  <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Recommended Action</span>
                    </div>
                    <p className="text-xs text-emerald-950 leading-relaxed">
                      {stage.data.recommendation}
                    </p>
                  </div>

                  {/* SHAP Explanation Toggle for Assessed Stages */}
                  {isAssessed && stage.data.shapContributions.length > 0 && (
                    <div className="border-t border-slate-100 pt-3">
                      <button
                        onClick={() => toggleShap(stage.key)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-blue-700 hover:text-blue-800 py-1 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>SHAP Factor Contributions</span>
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs animate-fadeIn">
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            SHAP Feature Attribution (Explanation Only)
                          </div>
                          {stage.data.shapContributions.map((sc, scIdx) => (
                            <div key={scIdx} className="space-y-1">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="font-semibold text-slate-700">{sc.factor}</span>
                                <span
                                  className={`font-mono font-bold ${
                                    sc.isPositive ? 'text-red-600' : 'text-emerald-600'
                                  }`}
                                >
                                  {sc.isPositive ? '+' : '-'}
                                  {sc.percentage}%
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-tight">
                                {sc.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Button for Unassessed Stages */}
              {!isAssessed && onNavigateToUpdate && (
                <div className="p-3 bg-slate-100/70 border-t border-slate-200/80">
                  <button
                    onClick={onNavigateToUpdate}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold border border-slate-200 shadow-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>Supply Stage Records</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
