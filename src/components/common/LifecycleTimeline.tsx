import React from 'react';
import { Stage } from '../../types';
import { CheckCircle2, Clock, CircleDot, ChevronRight } from 'lucide-react';

interface LifecycleTimelineProps {
  currentStage: Stage;
  onSelectStage?: (stage: Stage) => void;
}

const STAGES: Stage[] = [
  'Planning',
  'Notification',
  'Documentation',
  'Approval',
  'Compensation',
  'Legal / R&R',
  'Possession',
  'Completion',
];

export const LifecycleTimeline: React.FC<LifecycleTimelineProps> = ({
  currentStage,
}) => {
  const currentIndex = STAGES.indexOf(currentStage);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-gov-card overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Land Acquisition Stage Progression
          </h4>
          <p className="text-xs text-slate-500">
            Linear statutory lifecycle under the RFCTLARR Act framework.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed
          </span>
          <span className="flex items-center gap-1.5 text-blue-700">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" /> Active Stage
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Upcoming
          </span>
        </div>
      </div>

      <div className="relative min-w-[760px] py-4">
        {/* Continuous Track Line */}
        <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-slate-200 z-0">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{
              width: `${(Math.max(0, currentIndex) / (STAGES.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Stage Nodes */}
        <div className="relative z-10 flex items-center justify-between">
          {STAGES.map((stage, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isUpcoming = idx > currentIndex;

            return (
              <div key={stage} className="flex flex-col items-center group">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 border-blue-700 text-white ring-4 ring-blue-100 scale-110 shadow-md animate-pulse'
                      : 'bg-white border-slate-300 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isCurrent ? (
                    <CircleDot className="w-5 h-5" />
                  ) : (
                    <span className="text-xs font-bold font-mono">{idx + 1}</span>
                  )}
                </div>

                <div className="mt-2.5 text-center">
                  <span
                    className={`text-xs font-bold block ${
                      isCurrent
                        ? 'text-blue-900 underline decoration-blue-500 decoration-2'
                        : isCompleted
                        ? 'text-emerald-800'
                        : 'text-slate-500'
                    }`}
                  >
                    {stage}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-tight block">
                    {isCompleted
                      ? 'Completed'
                      : isCurrent
                      ? 'In Progress'
                      : 'Pending'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
