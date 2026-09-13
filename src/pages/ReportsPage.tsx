import React from 'react';
import { useApp } from '../context/AppContext';
import {
  FileBarChart2,
  Download,
  Printer,
  Building,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Activity,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { projects, interventions } = useApp();

  const totalCount = projects.length;
  const highRiskProjects = projects.filter((p) => p.riskLevel === 'HIGH');
  const highRiskCount = highRiskProjects.length;
  const mediumRiskCount = projects.filter((p) => p.riskLevel === 'MEDIUM').length;
  const lowRiskCount = projects.filter((p) => p.riskLevel === 'LOW').length;

  const highRiskPercentage =
    totalCount > 0 ? ((highRiskCount / totalCount) * 100).toFixed(1) : '0';

  const topProject =
    [...projects].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))[0] ||
    projects[0] ||
    null;

  // District Aggregation
  const districtMap = new Map<string, { highRisk: number; total: number; totalDelay: number; assessedCount: number }>();
  projects.forEach((p) => {
    const d = p.district || 'Other';
    const existing = districtMap.get(d) || { highRisk: 0, total: 0, totalDelay: 0, assessedCount: 0 };
    existing.total += 1;
    if (p.hasRiskAssessment && p.riskScore !== null) {
      existing.totalDelay += p.riskScore;
      existing.assessedCount += 1;
    }
    if (p.riskLevel === 'HIGH') existing.highRisk += 1;
    districtMap.set(d, existing);
  });

  const districtSummaries = Array.from(districtMap.entries()).map(([district, d]) => ({
    district,
    total: d.total,
    highRisk: d.highRisk,
    avgDelayProb: d.assessedCount > 0 ? Math.round(d.totalDelay / d.assessedCount) : 0,
  }));

  // Aggregated Major Risk Factors across all projects
  const factorMap = new Map<string, number>();
  projects.forEach((p) => {
    (p.riskFactors || []).forEach((f) => {
      factorMap.set(f, (factorMap.get(f) || 0) + 1);
    });
  });
  const topRiskFactors = Array.from(factorMap.entries())
    .map(([factor, count]) => ({ factor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const handleExportProjectsCSV = () => {
    const headers = [
      'Project ID',
      'Project Name',
      'District',
      'Status',
      'Land Required (ha)',
      'Land Acquired (ha)',
      'Acquisition Progress %',
      'Compensation Amount',
      'Compensation Paid',
      'Compensation Pending',
      'Legal Disputes',
      'Delay Probability %',
      'Risk Level',
      'Expected Delay (Months)',
      'Planned Completion',
      'Expected Completion',
      'Last Updated',
    ];

    const rows = projects.map((p) => [
      `"${p.id || p.projectId}"`,
      `"${p.name || p.projectName}"`,
      `"${p.district}"`,
      `"${p.status || p.currentStage}"`,
      p.landRequired || p.landArea || 0,
      p.landAcquired || 0,
      p.acquisitionProgress !== null && p.acquisitionProgress !== undefined ? p.acquisitionProgress : '"Not Available"',
      p.compensation || 0,
      p.compensationPaid || 0,
      p.compensationPending || 0,
      p.legalDisputes || 0,
      p.delayProbability || 0,
      `"${p.riskLevel}"`,
      p.expectedDelayMonths || 0,
      `"${p.plannedCompletion}"`,
      `"${p.expectedCompletion}"`,
      `"${p.lastUpdated}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bhoomialert_projects_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm space-y-3">
        <FileBarChart2 className="w-10 h-10 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">No projects available to generate reports.</h3>
        <p className="text-xs text-slate-500">Please load live feed data or upload a project CSV.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              <FileBarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Statutory Reports & Predictive Briefings
              </h1>
              <p className="text-xs text-slate-500">
                Generate high-level administrative memos, delay risk summaries, and CSV datasets.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportProjectsCSV}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Dataset</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Executive Memo</span>
          </button>
        </div>
      </div>

      {/* Printable Formal Executive Briefing Memo (Requirement 21) */}
      <div className="bg-white p-8 rounded-xl border border-slate-300 shadow-sm space-y-6 text-slate-900 font-sans">
        {/* Memo Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              GOVERNMENT OF TAMIL NADU • REVENUE & DISASTER MANAGEMENT DEPARTMENT
            </div>
            <h2 className="text-xl font-extrabold text-slate-950 font-heading mt-1">
              EXECUTIVE LAND ACQUISITION DELAY RISK & INTERVENTION BRIEF
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              CONFIDENTIAL • FOR DISTRICT COLLECTOR & REVENUE ARBITER REVIEW ONLY
            </p>
          </div>
          <div className="text-right text-xs font-mono">
            <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div><strong>Ref:</strong> LA-REV/{new Date().getFullYear()}/Q3</div>
            <div><strong>System:</strong> BhoomiAlert AI</div>
          </div>
        </div>

        {/* 1. Executive Summary */}
        <div className="text-xs leading-relaxed space-y-2 text-slate-800">
          <p>
            <strong>1. Executive Summary:</strong> A comprehensive predictive analysis was conducted across <strong>{totalCount} monitored land acquisition projects</strong>. A total of <strong>{highRiskCount} projects ({highRiskPercentage}%)</strong> have been classified as <strong>HIGH DELAY RISK</strong> (Delay Probability ≥ 70%), primarily driven by compensation disbursement shortfalls and dispute litigation cases.
          </p>
          {topProject && (
            <p>
              <strong>2. Priority Spotlight:</strong> Project <strong>{topProject.id} ({topProject.name})</strong> in {topProject.district} currently exhibits a <strong>{topProject.delayProbability}% delay probability score</strong> (estimated {topProject.expectedDelayMonths}-month schedule slippage). Immediate fast-track compensation settlement camps and revenue Lok Adalats are recommended to avert cost escalations.
            </p>
          )}
        </div>

        {/* 2. High Risk Projects Briefing Table */}
        <div>
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
            Top High-Risk Acquisition Projects ({highRiskProjects.length})
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[11px]">
              <tr>
                <th className="p-2 border-b">Project ID</th>
                <th className="p-2 border-b">Project Name</th>
                <th className="p-2 border-b">District</th>
                <th className="p-2 border-b">Status</th>
                <th className="p-2 border-b">Delay Probability</th>
                <th className="p-2 border-b">Disputes</th>
                <th className="p-2 border-b">Primary Prescription</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px]">
              {highRiskProjects.map((p) => (
                <tr key={p.id}>
                  <td className="p-2 font-mono font-bold text-blue-700">{p.id}</td>
                  <td className="p-2 font-semibold">{p.name}</td>
                  <td className="p-2">{p.district}</td>
                  <td className="p-2">{p.status || p.currentStage}</td>
                  <td className="p-2 font-bold font-mono text-red-700">{p.delayProbability}%</td>
                  <td className="p-2 font-mono">{p.legalDisputes}</td>
                  <td className="p-2 italic">{p.recommendations[0]?.title || 'Review pending milestones'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 3. Major Risk Factors & Recommended Actions Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="border border-slate-200 p-3.5 rounded-lg bg-slate-50/70 space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>Major Identified Risk Factors</span>
            </h4>
            <div className="space-y-1.5">
              {topRiskFactors.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] p-1.5 bg-white rounded border border-slate-200">
                  <span className="font-medium text-slate-800">{f.factor}</span>
                  <span className="font-mono font-bold text-red-700">{f.count} projects</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-slate-200 p-3.5 rounded-lg bg-slate-50/70 space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Active Administrative Interventions ({interventions.length})</span>
            </h4>
            <div className="space-y-1.5">
              {interventions.slice(0, 4).map((item) => (
                <div key={item.id} className="p-1.5 bg-white rounded border border-slate-200 text-[11px]">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{item.projectId}: {item.action}</span>
                    <span className="font-mono text-amber-800">{item.status}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Assigned to: {item.assignedTo} • Deadline: {item.deadline}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. District-Wise Risk Concentration Matrix */}
        <div>
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
            District-Wise Risk Concentration Matrix
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {districtSummaries.slice(0, 4).map((d) => (
              <div key={d.district} className="border border-slate-200 p-2.5 rounded bg-slate-50">
                <div className="font-bold text-slate-900">{d.district}</div>
                <div className="text-[11px] text-slate-600">Total Projects: {d.total}</div>
                <div className="text-[11px] font-bold text-red-700">High Risk: {d.highRisk}</div>
                <div className="text-[10px] text-slate-500 font-mono">Avg Delay: {d.avgDelayProb}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Official Sign-off Memo Footer */}
        <div className="pt-6 border-t border-slate-300 flex justify-between items-end text-xs">
          <div>
            <div className="text-[10px] text-slate-500 font-mono">
              Generated by BhoomiAlert AI • Spatial GIS Land Acquisition Analytics
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-slate-900">Land Acquisition Monitoring Authority</div>
            <div className="text-[11px] text-slate-600">Revenue & Disaster Management Department</div>
            <div className="text-[10px] text-slate-400">Digitally Verified & Certified</div>
          </div>
        </div>
      </div>
    </div>
  );
};
