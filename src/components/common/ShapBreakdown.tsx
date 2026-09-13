import React from 'react';
import { ShapContribution } from '../../types';
import { Info, Sparkles, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ShapBreakdownProps {
  contributions: ShapContribution[];
  projectId: string;
  projectName: string;
  explanation: string;
}

export const ShapBreakdown: React.FC<ShapBreakdownProps> = ({
  contributions,
  projectId,
  explanation,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-gov-card overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Why is {projectId} at risk?
              <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                SHAP Feature Importance
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Feature attribution analysis decomposing delay probability into contributing drivers.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-800 border border-indigo-200">
          <Info className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
          <span>Feature Attribution & Delay Drivers</span>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Natural Language Explanation Box */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <div className="p-1 bg-blue-100 text-blue-700 rounded-md mt-0.5">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-0.5">
              AI Delay Root Cause Summary
            </div>
            <p className="text-sm text-blue-950 font-medium leading-relaxed">
              "{explanation}"
            </p>
          </div>
        </div>

        {/* Contribution Breakdown Bars */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Factor Contribution to Delay Probability
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Relative Impact (+ Risk Driver / − Risk Mitigator)
            </div>
          </div>

          <div className="space-y-3.5">
            {contributions.map((item, idx) => {
              const isIncrease = item.percentage >= 0;
              const absVal = Math.abs(item.percentage);

              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {isIncrease ? (
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-slate-900">
                        {item.factor}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                          isIncrease
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isIncrease ? `+${absVal}%` : `-${absVal}%`}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isIncrease
                          ? 'bg-gradient-to-r from-red-500 to-rose-600'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-600'
                      }`}
                      style={{ width: `${Math.min(100, absVal * 2.2)}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-500 mt-1.5 leading-normal">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Major Contributors Summary Cards */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Top Priority Contributing Bottlenecks
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {contributions.slice(0, 4).map((c, i) => (
              <div
                key={i}
                className="bg-white p-2.5 rounded-md border border-slate-200 text-center shadow-xs"
              >
                <div className="text-[11px] text-slate-500 font-medium truncate">
                  {c.factor}
                </div>
                <div className="text-sm font-bold text-red-600 font-mono mt-0.5">
                  +{c.percentage}% Risk Push
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
