import React from 'react';
import { RiskLevel } from '../../types';

interface RiskGaugeProps {
  probability: number | null; // 0 to 100 or null
  riskLevel: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  probability,
  riskLevel,
  size = 'md',
  showLabels = true,
}) => {
  const isUnassessed = probability === null || riskLevel === 'NOT ASSESSED';
  // SVG semi-circle gauge calculation
  // Radius = 80, Center = (100, 100)
  // Angle: 180 degrees (from PI to 0) -> Angle in degrees = 180 - (prob / 100) * 180
  const clampedProb = isUnassessed ? 0 : Math.min(100, Math.max(0, probability));
  const angle = isUnassessed ? 90 : 180 - (clampedProb / 100) * 180;
  const radians = (angle * Math.PI) / 180;

  // Needle tip coordinate
  const needleLength = 65;
  const needleX = 100 + needleLength * Math.cos(radians);
  const needleY = 100 - needleLength * Math.sin(radians);

  // Colors based on risk level
  const getColor = () => {
    if (isUnassessed) return '#64748b';
    if (clampedProb >= 70) return '#dc2626'; // Red
    if (clampedProb >= 40) return '#d97706'; // Amber
    return '#059669'; // Green
  };

  const getBgBadge = () => {
    if (isUnassessed) return 'bg-slate-100 text-slate-700 border-slate-300 ring-slate-400/20';
    if (clampedProb >= 70)
      return 'bg-red-50 text-red-700 border-red-200 ring-red-500/20';
    if (clampedProb >= 40)
      return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20';
  };

  const dim = size === 'sm' ? 140 : size === 'lg' ? 240 : 190;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: dim, height: dim * 0.65 }}>
        <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="35%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="85%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Background track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Colored arc track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="16"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Range ticks */}
          <circle cx="20" cy="100" r="2.5" fill="#64748b" />
          <circle cx="100" cy="20" r="2.5" fill="#64748b" />
          <circle cx="180" cy="100" r="2.5" fill="#64748b" />

          {/* Pivot base */}
          <circle cx="100" cy="100" r="10" fill="#1e293b" />
          <circle cx="100" cy="100" r="4" fill="#ffffff" />

          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2={needleX}
            y2={needleY}
            stroke="#0f172a"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#needleGlow)"
            className="transition-all duration-700 ease-out"
          />
          {/* Needle center cap accent */}
          <circle cx={needleX} cy={needleY} r="3" fill={getColor()} />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <div className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
            {isUnassessed ? 'N/A' : `${clampedProb}%`}
          </div>
          {isUnassessed && (
            <div className="text-[10px] text-slate-500 font-sans font-medium">Awaiting Field Data</div>
          )}
        </div>
      </div>

      {showLabels && (
        <div className="mt-1 flex flex-col items-center">
          <span
            className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ring-1 ${getBgBadge()}`}
          >
            <span
              className="w-2 h-2 rounded-full mr-1.5 animate-pulse"
              style={{ backgroundColor: getColor() }}
            />
            {isUnassessed ? 'NOT ASSESSED' : `${riskLevel} RISK`}
          </span>

          <div className="flex items-center justify-between w-full max-w-[200px] mt-2 text-[10px] text-slate-500 font-medium px-1">
            <span className="text-emerald-700">0–39 Low</span>
            <span className="text-amber-700">40–69 Med</span>
            <span className="text-red-700">70–100 High</span>
          </div>
        </div>
      )}
    </div>
  );
};
