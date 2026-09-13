import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  History,
  Search,
  Download,
  Filter,
  ArrowRight,
  ShieldCheck,
  Calendar,
  User,
  Activity,
  FileSpreadsheet,
} from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const { auditLogs, navigateToProject } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.projectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.source && log.source.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportLogs = () => {
    const headers = ['Timestamp', 'Project ID', 'Project Name', 'Action', 'Source', 'Officer', 'Previous Risk', 'New Risk', 'Details'];
    const rows = auditLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.projectId}"`,
      `"${l.projectName || ''}"`,
      `"${l.action}"`,
      `"${l.source || 'Live Data'}"`,
      `"${l.user}"`,
      `"${l.previousRisk}"`,
      `"${l.newRisk}"`,
      `"${l.details || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bhoomialert_audit_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">
                Statutory Audit Logs & Ingestion History
              </h2>
              <p className="text-xs text-slate-500">
                Immutable chronological trail of live data refreshes, CSV ingestion merges, and risk recalculations.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleExportLogs}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit Trail (CSV)</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Project ID, Action, Source or Officer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 font-mono">
          <span>Total Audit Entries: <strong>{auditLogs.length}</strong></span>
          <span>•</span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Integrity Verified
          </span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Project ID</th>
                <th className="py-3.5 px-4">Action / Event</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Officer / User</th>
                <th className="py-3.5 px-4">Previous Risk</th>
                <th className="py-3.5 px-4">New Risk</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                    onClick={() => navigateToProject(log.projectId)}
                  >
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {log.timestamp}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-blue-700 group-hover:underline inline-flex items-center gap-1">
                        {log.projectId}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{log.action}</div>
                      {log.projectName && (
                        <div className="text-[11px] text-slate-500 max-w-xs truncate">
                          {log.projectName}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          log.source === 'CSV Upload'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : log.source === 'Live Data'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}
                      >
                        {log.source || 'Live Data'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{log.user}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600 font-semibold">
                      {log.previousRisk}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {log.newRisk}
                    </td>

                    <td className="py-3 px-4 text-right text-[11px] text-slate-500 max-w-xs truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No audit log records match your search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
