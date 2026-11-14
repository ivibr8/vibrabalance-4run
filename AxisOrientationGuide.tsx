import React from 'react';
import { SensorAxis } from '../types/balancing';

interface Props {
  selectedAxis: SensorAxis;
  onSelectAxis?: (axis: SensorAxis) => void;
  compact?: boolean;
}

export const AxisOrientationGuide: React.FC<Props> = ({
  selectedAxis,
  onSelectAxis,
  compact = false,
}) => {
  const axesInfo: {
    id: SensorAxis;
    label: string;
    short: string;
    direction: string;
    tip: string;
    badgeColor: string;
  }[] = [
    {
      id: 'triaxial',
      label: 'Triaxial (X+Y+Z RSS)',
      short: '3D RSS',
      direction: 'All 3 Axes Combined (Freq-Domain)',
      tip: 'Best default: captures total 1X radial vibration regardless of how the phone is tilted or held.',
      badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    },
    {
      id: 'z',
      label: 'Z-Axis (In / Out of Screen)',
      short: 'Z',
      direction: '+Z points out of glass display',
      tip: 'Use when laying phone flat (back down) on top of a bearing to measure vertical vibration.',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    {
      id: 'x',
      label: 'X-Axis (Sideways / Left–Right)',
      short: 'X',
      direction: '+X points toward right edge',
      tip: 'Use when holding phone upright/flat to measure horizontal side-to-side bearing vibration.',
      badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
    },
    {
      id: 'y',
      label: 'Y-Axis (Bottom–Top)',
      short: 'Y',
      direction: '+Y points toward top earpiece',
      tip: 'Use when pointing top edge of phone radially toward the shaft centerline.',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    },
  ];

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Standard W3C / Android / iOS Smartphone Coordinate SVG */}
        <div className="shrink-0 flex flex-col items-center">
          <svg
            viewBox="0 0 200 180"
            className={compact ? 'w-36 h-32' : 'w-44 h-40'}
            aria-label="Standard Smartphone Accelerometer Axis Diagram"
          >
            <defs>
              <marker id="arrowX" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#e11d48" />
              </marker>
              <marker id="arrowY" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#059669" />
              </marker>
              <marker id="arrowZ" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#d97706" />
              </marker>
            </defs>

            {/* Phone Body (Portrait facing user) */}
            <rect
              x="64"
              y="32"
              width="68"
              height="120"
              rx="10"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="2"
            />
            {/* Screen */}
            <rect
              x="69"
              y="40"
              width="58"
              height="102"
              rx="5"
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeWidth="1"
            />
            {/* Top Earpiece / Camera */}
            <circle cx="98" cy="36" r="1.8" fill="#64748b" />

            {/* Origin Dot at Phone Center */}
            <circle cx="98" cy="91" r="3.5" fill="#0f172a" />

            {/* +Y Axis: Bottom to Top */}
            <line
              x1="98"
              y1="91"
              x2="98"
              y2="12"
              stroke="#059669"
              strokeWidth={selectedAxis === 'y' ? '3' : '2'}
              markerEnd="url(#arrowY)"
            />
            <text
              x="106"
              y="18"
              fill="#047857"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              +Y (Top)
            </text>

            {/* +X Axis: Left to Right */}
            <line
              x1="98"
              y1="91"
              x2="182"
              y2="91"
              stroke="#e11d48"
              strokeWidth={selectedAxis === 'x' ? '3' : '2'}
              markerEnd="url(#arrowX)"
            />
            <text
              x="140"
              y="83"
              fill="#be123c"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              +X (Right)
            </text>

            {/* +Z Axis: Coming Out of Screen Toward Viewer */}
            <line
              x1="98"
              y1="91"
              x2="42"
              y2="132"
              stroke="#d97706"
              strokeWidth={selectedAxis === 'z' ? '3' : '2'}
              markerEnd="url(#arrowZ)"
            />
            <text
              x="6"
              y="148"
              fill="#b45309"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              +Z (Out of Screen)
            </text>
          </svg>
          <span className="text-[10px] text-slate-500 font-mono text-center">
            Standard Android &amp; iOS Axes
          </span>
        </div>

        {/* Axis Descriptions & Selectable Cards */}
        <div className="flex-1 space-y-2 w-full">
          <div className="text-[11px] text-slate-600 leading-snug">
            All modern phones (Pixel 4a, Samsung, iPhone) use the <strong>W3C Standard Coordinate System</strong> looking at the portrait screen: <strong>X</strong> = Left/Right, <strong>Y</strong> = Bottom/Top, <strong>Z</strong> = In/Out of Screen.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {axesInfo.map((ax) => {
              const active = selectedAxis === ax.id;
              const Wrapper = onSelectAxis ? 'button' : 'div';
              return (
                <Wrapper
                  key={ax.id}
                  {...(onSelectAxis ? { type: 'button' as const, onClick: () => onSelectAxis(ax.id) } : {})}
                  className={`text-left p-2.5 rounded-lg border transition-all ${
                    onSelectAxis ? 'cursor-pointer' : ''
                  } ${
                    active
                      ? 'bg-white border-cyan-500 ring-2 ring-cyan-500/20 shadow-xs'
                      : 'bg-white/70 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-slate-900">{ax.label}</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${ax.badgeColor}`}>
                      {ax.short}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1 leading-tight">{ax.tip}</p>
                </Wrapper>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
