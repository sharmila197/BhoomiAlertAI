import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Intervention } from '../types';
import { generateProjectInterventions } from '../utils/interventionEngine';
import {
  Wrench,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  Filter,
  User,
  Building,
  Calendar,
} from 'lucide-react';

export const InterventionsPage: React.FC = () => {
  const {
    interventions,
    projects,
    addIntervention,
    updateInterventionStatus,
    navigateToProject,
  } = useApp();

  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // New intervention form
  const [newProjId, setNewProjId] = useState(projects[0]?.id || '');
  const [newAction, setNewAction] = useState('');
  const [newPriority, setNewPriority] = useState<Intervention['priority']>('Critical');
  const [newDept, setNewDept] = useState('Revenue & Land Acquisition Wing');
  const [newAssignedTo, setNewAssignedTo] = useState('Special DRO (LA)');
  const [newDeadline, setNewDeadline] = useState('15-09-2026');
  const [newNotes, setNewNotes] = useState('');

  // Fallback to dynamically generated project interventions if no manual orders exist
  const effectiveInterventions = useMemo<Intervention[]>(() => {
    if (interventions.length > 0) return interventions;
    const generated = generateProjectInterventions(projects, 50);
    return generated.map((item) => ({
      id: `INT-${item.projectId}`,
      projectId: item.projectId,
      projectName: item.projectName,
      action: item.recommendedAction,
      priority: item.riskLevel === 'HIGH' ? 'Critical' : item.riskLevel === 'MEDIUM' ? 'High' : 'Medium',
      department: 'Revenue & Land Acquisition Administration',
      assignedTo: 'Special DRO (LA)',
      deadline: '30-09-2026',
      status: 'Pending',
      createdAt: '07-09-2026',
      notes: `Triggered issue: ${item.mainIssue}`,
    }));
  }, [interventions, projects]);

  const filteredInterventions = effectiveInterventions.filter((item) => {
    if (selectedStatus !== 'All' && item.status !== selectedStatus) return false;
    if (selectedPriority !== 'All' && item.priority !== selectedPriority) return false;
    return true;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAction.trim()) return;

    const proj = projects.find((p) => p.id === newProjId);

    addIntervention({
      projectId: newProjId,
      projectName: proj?.name || 'Infrastructure Parcel',
      action: newAction,
      priority: newPriority,
      department: newDept,
      assignedTo: newAssignedTo,
      deadline: newDeadline,
      status: 'Pending',
      notes: newNotes,
    });

    setShowAddModal(false);
    setNewAction('');
    setNewNotes('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-gov-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">
                Administrative Intervention & Compliance Tracking
              </h2>
              <p className="text-xs text-slate-500">
                Track executive orders, fast-track settlement camps, and inter-departmental escalations.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Intervention Order</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-gov-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-bold text-slate-700 uppercase">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filter Status:</span>
          </div>
          {['All', 'Pending', 'In Progress', 'Completed', 'Escalated'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                selectedStatus === st
                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 uppercase">Priority:</span>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="p-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-medium"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Interventions List / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredInterventions.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 shadow-gov-card p-5 flex flex-col justify-between hover:border-slate-300 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {item.id}
                  </span>
                  <button
                    onClick={() => navigateToProject(item.projectId)}
                    className="font-mono text-xs font-bold text-slate-700 hover:text-blue-700 hover:underline"
                  >
                    {item.projectId}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      item.priority === 'Critical'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : item.priority === 'High'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {item.priority}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      item.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : item.status === 'Escalated'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-900 mb-1">
                {item.action}
              </h3>
              <p className="text-xs text-slate-500 font-medium mb-3">
                Project: {item.projectName}
              </p>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-xs text-slate-700 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5" /> Department:
                  </span>
                  <span className="font-semibold">{item.department}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Assigned To:
                  </span>
                  <span className="font-semibold">{item.assignedTo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Due Date:
                  </span>
                  <span className="font-mono font-bold text-red-700">{item.deadline}</span>
                </div>
                {item.notes && (
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 italic">
                    "{item.notes}"
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons: Start, In Progress, Completed, Escalate */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400">Created:</span>
                <span className="font-mono font-semibold text-slate-600">{item.createdAt}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.status !== 'In Progress' && item.status !== 'Completed' && (
                  <button
                    onClick={() => updateInterventionStatus(item.id, 'In Progress')}
                    className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded border border-blue-200 transition-colors"
                  >
                    Start / In Progress
                  </button>
                )}
                {item.status !== 'Completed' && (
                  <button
                    onClick={() => updateInterventionStatus(item.id, 'Completed')}
                    className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded border border-emerald-200 transition-colors"
                  >
                    Mark Completed
                  </button>
                )}
                {item.status !== 'Escalated' && item.status !== 'Completed' && (
                  <button
                    onClick={() => updateInterventionStatus(item.id, 'Escalated')}
                    className="px-2.5 py-1 text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white rounded border border-purple-200 transition-colors"
                  >
                    Escalate
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Create Administrative Intervention Order
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Target Land Acquisition Project
                </label>
                <select
                  value={newProjId}
                  onChange={(e) => setNewProjId(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-slate-50 font-medium"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.name} ({p.district})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Intervention Action Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct Joint Title Settlement Lok Adalat"
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Priority Level
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e: any) => setNewPriority(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Compliance Due Date
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="DD-MM-YYYY"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Responsible Department
                </label>
                <input
                  type="text"
                  required
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Assigned Officer / Authority
                </label>
                <input
                  type="text"
                  required
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Special Instructions / Notes
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Additional context or statutory references..."
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Issue Intervention
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
