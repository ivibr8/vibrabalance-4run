import React, { useState } from 'react';
import { BalancingCalculationResult, BalancingConfig, RunData } from '../types/balancing';
import {
  Compass,
  RotateCcw,
  Printer,
  ArrowLeft,
  CheckCircle,
  Layers,
  Eye,
  Info,
} from 'lucide-react';

interface Props {
  solution: BalancingCalculationResult;
  config: BalancingConfig;
  runs: RunData[];
  onBackToRuns: () => void;
  onResetBalancing: () => void;
}

export const PolarPlotScreen: React.FC<Props> = ({
  solution,
  config,
  runs,
  onBackToRuns,
  onResetBalancing,
}) => {
  const [showCircles, setShowCircles] = useState(true);
  const [showTrialLabels, setShowTrialLabels] = useState(true);

  const size = 560;
  const center = size / 2;
  const maxPlotRadius = center - 45;

  const maxRadiusMils = Math.max(
    solution.o * 2.2,
    solution.ot1 * 1.5,
    solution.ot2 * 1.5,
    solution.ot3 * 1.5,
    solution.intersection.distance * 1.5,
    0.1
  );

  const scale = maxPlotRadius / maxRadiusMils;

  const toSvgX = (xMils: number) => center + xMils * scale;
  const toSvgY = (yMils: number) => center - yMils * scale;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      {/* Header Bar */}
      <div className="bg-white border border-slate-300 rounded-2xl p-5 md:p-6 flex flex-wrap items-center justify-between gap-3 shadow-md shadow-slate-200/60 ring-1 ring-slate-900/5">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              Polar Plot & Correction Weight Solution
            </h1>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            4-Run No-Phase Dynamic Balancing polar graphical solution
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={onResetBalancing}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Balance</span>
          </button>
        </div>
      </div>

      {/* Primary Calculated Correction Weight Card */}
      <div className="bg-gradient-to-br from-emerald-50/80 via-white to-white border border-emerald-300 rounded-2xl p-5 md:p-6 shadow-md shadow-emerald-900/5 ring-1 ring-emerald-500/10 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Calculated Correction Weight
          </span>
          <span className="text-xs font-mono text-slate-600">
            Trial Mass: {config.trialMass} {config.massUnit}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Weight */}
          <div className="bg-white border border-emerald-200/90 rounded-xl p-4 text-center shadow-xs">
            <span className="text-xs text-slate-600 font-medium">Correction Mass</span>
            <div className="text-3xl md:text-4xl font-extrabold text-emerald-700 font-mono mt-1">
              {solution.correctionWeight} <span className="text-lg font-normal text-slate-600">{config.massUnit}</span>
            </div>
            <span className="text-[11px] text-emerald-700 mt-1 block font-mono font-medium">
              (Expected approx. 1.17 – 1.18 {config.massUnit})
            </span>
          </div>

          {/* Angle */}
          <div className="bg-white border border-emerald-200/90 rounded-xl p-4 text-center shadow-xs">
            <span className="text-xs text-slate-600 font-medium">Correction Angle</span>
            <div className="text-3xl md:text-4xl font-extrabold text-emerald-700 font-mono mt-1">
              {solution.correctionAngleDeg}° <span className="text-lg font-normal text-slate-600">({config.rotationDirection})</span>
            </div>
            <span className="text-[11px] text-slate-600 mt-1 block">
              Vector from center of "O" circle to 3-run circle intersection
            </span>
          </div>
        </div>

        {/* Calculation Formula Transparency Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 text-xs shadow-2xs">
          <div className="flex items-center justify-between text-slate-800 font-semibold">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-700" />
              Four-Run Mathematical Calculation Details:
            </span>
            <span className="font-mono text-cyan-800 text-[11px] font-bold">
              T = {solution.trialEffectT} mils
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-700 space-y-1">
            <p>
              • Trial Effect: <span className="text-slate-900">T = √[(OT₁² + OT₂² + OT₃² - 3·O²) / 3]</span> = √[({solution.ot1}² + {solution.ot2}² + {solution.ot3}² - 3·{solution.o}²) / 3] = <strong className="text-cyan-800">{solution.trialEffectT} mils</strong>
            </p>
            <p>
              • Correction Weight: <span className="text-slate-900">W_c = W_T × (O / T)</span> = {config.trialMass} {config.massUnit} × ({solution.o} / {solution.trialEffectT}) = <strong className="text-emerald-700">{solution.correctionWeight} {config.massUnit}</strong> (approx. 1.17 {config.massUnit})
            </p>
          </div>
        </div>

        {/* Trim Weight Alternative (if trial mass retained) */}
        {solution.trimWeight !== undefined && (
          <div className="pt-2 border-t border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-700">
            <span className="text-slate-600">
              Alternative (Leave trial mass on rotor):
            </span>
            <span className="font-mono font-bold text-amber-800">
              Add Trim Weight: {solution.trimWeight} {config.massUnit} @ {solution.trimAngleDeg}°
            </span>
          </div>
        )}
      </div>

      {/* Polar Plot Graphic Construction */}
      <div className="bg-white border border-slate-300 rounded-2xl p-5 md:p-6 space-y-4 shadow-md shadow-slate-200/60 ring-1 ring-slate-900/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-slate-900">
              Polar Plot Graphical Construction
            </h2>
            <p className="text-xs text-slate-600">
              "O" polar circle with trial weights at phase locations and circles with radii of measured runs
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setShowCircles(!showCircles)}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                showCircles
                  ? 'bg-slate-100 border-slate-300 text-cyan-800 font-semibold'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3 Run Circles</span>
            </button>
            <button
              onClick={() => setShowTrialLabels(!showTrialLabels)}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                showTrialLabels
                  ? 'bg-slate-100 border-slate-300 text-emerald-800 font-semibold'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Labels</span>
            </button>
          </div>
        </div>

        {/* SVG Canvas with subtle border shading */}
        <div className="relative w-full max-w-xl mx-auto aspect-square bg-white rounded-2xl border border-slate-300 p-2 overflow-hidden shadow-md shadow-slate-200/80 ring-1 ring-slate-900/5">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full select-none">
            <defs>
              <marker
                id="arrow-correction-light"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669" />
              </marker>

              <filter id="glow-inter-light" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#059669" floodOpacity="0.4" />
              </filter>
            </defs>

            {/* Concentric Polar Grid Rings */}
            {[0.25, 0.5, 0.75, 1.0].map((frac) => {
              const r = maxPlotRadius * frac;
              const milsVal = (maxRadiusMils * frac).toFixed(1);
              return (
                <g key={`polar-grid-${frac}`}>
                  <circle
                    cx={center}
                    cy={center}
                    r={r}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray={frac === 1.0 ? 'none' : '3 3'}
                  />
                  <text
                    x={center + 4}
                    y={center - r + 11}
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {milsVal} mils
                  </text>
                </g>
              );
            })}

            {/* Radial 30-degree Rays and Degree Text */}
            {Array.from({ length: 12 }).map((_, idx) => {
              const deg = idx * 30;
              const rad = deg * (Math.PI / 180);
              const xInner = center + 12 * Math.cos(rad);
              const yInner = center - 12 * Math.sin(rad);
              const xOuter = center + maxPlotRadius * Math.cos(rad);
              const yOuter = center - maxPlotRadius * Math.sin(rad);
              const xLabel = center + (maxPlotRadius + 18) * Math.cos(rad);
              const yLabel = center - (maxPlotRadius + 18) * Math.sin(rad) + 3;

              return (
                <g key={`ray-${deg}`}>
                  <line
                    x1={xInner}
                    y1={yInner}
                    x2={xOuter}
                    y2={yOuter}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                  <text
                    x={xLabel}
                    y={yLabel}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {deg}°
                  </text>
                </g>
              );
            })}

            {/* Outer Rim */}
            <circle cx={center} cy={center} r={maxPlotRadius} fill="none" stroke="#94a3b8" strokeWidth="1.5" />

            {/* 1. THE "O" POLAR PLOT CIRCLE (No interior fill shading) */}
            <circle
              cx={center}
              cy={center}
              r={solution.o * scale}
              fill="none"
              stroke="#dc2626"
              strokeWidth="2.5"
              strokeDasharray="5 3"
            />

            {/* Label for "O" Circle */}
            <g transform={`translate(${center + (solution.o * scale) * 0.7}, ${center - (solution.o * scale) * 0.7})`}>
              <rect x="0" y="0" width="80" height="18" rx="4" fill="#fef2f2" stroke="#f87171" opacity="0.95" />
              <text x="40" y="12" textAnchor="middle" fill="#991b1b" fontSize="9" fontWeight="bold" fontFamily="monospace">
                "O": {solution.o} mils
              </text>
            </g>

            {/* 2. THE THREE RUN CIRCLES (Outer circles colored, zero interior color fill shading) */}
            {showCircles && (
              <>
                {/* Run O+T1 Circle (Blue) */}
                <circle
                  cx={toSvgX(solution.t1Location.x)}
                  cy={toSvgY(solution.t1Location.y)}
                  r={solution.t1Location.r * scale}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2"
                />

                {/* Run O+T2 Circle (Purple) */}
                <circle
                  cx={toSvgX(solution.t2Location.x)}
                  cy={toSvgY(solution.t2Location.y)}
                  r={solution.t2Location.r * scale}
                  fill="none"
                  stroke="#9333ea"
                  strokeWidth="2"
                />

                {/* Run O+T3 Circle (Amber) */}
                <circle
                  cx={toSvgX(solution.t3Location.x)}
                  cy={toSvgY(solution.t3Location.y)}
                  r={solution.t3Location.r * scale}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2"
                />
              </>
            )}

            {/* 3. TRIAL WEIGHT LOCATIONS ON THE "O" CIRCLE */}
            {/* T1 */}
            <circle
              cx={toSvgX(solution.t1Location.x)}
              cy={toSvgY(solution.t1Location.y)}
              r="6"
              fill="#0284c7"
              stroke="#ffffff"
              strokeWidth="2"
            />
            {showTrialLabels && (
              <text
                x={toSvgX(solution.t1Location.x)}
                y={toSvgY(solution.t1Location.y) - 10}
                textAnchor="middle"
                fill="#0369a1"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                T1 ({solution.t1Angle}°)
              </text>
            )}

            {/* T2 */}
            <circle
              cx={toSvgX(solution.t2Location.x)}
              cy={toSvgY(solution.t2Location.y)}
              r="6"
              fill="#9333ea"
              stroke="#ffffff"
              strokeWidth="2"
            />
            {showTrialLabels && (
              <text
                x={toSvgX(solution.t2Location.x)}
                y={toSvgY(solution.t2Location.y) - 10}
                textAnchor="middle"
                fill="#7e22ce"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                T2 ({solution.t2Angle}°)
              </text>
            )}

            {/* T3 */}
            <circle
              cx={toSvgX(solution.t3Location.x)}
              cy={toSvgY(solution.t3Location.y)}
              r="6"
              fill="#d97706"
              stroke="#ffffff"
              strokeWidth="2"
            />
            {showTrialLabels && (
              <text
                x={toSvgX(solution.t3Location.x)}
                y={toSvgY(solution.t3Location.y) - 10}
                textAnchor="middle"
                fill="#b45309"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                T3 ({solution.t3Angle}°)
              </text>
            )}

            {/* 4. THE INTERSECTION POINT OF THE THREE RUNS */}
            <circle
              cx={toSvgX(solution.intersection.x)}
              cy={toSvgY(solution.intersection.y)}
              r="7"
              fill="#059669"
              stroke="#ffffff"
              strokeWidth="2.5"
              filter="url(#glow-inter-light)"
            />

            {/* 5. THE CORRECTION WEIGHT VECTOR */}
            <line
              x1={center}
              y1={center}
              x2={toSvgX(solution.intersection.x)}
              y2={toSvgY(solution.intersection.y)}
              stroke="#059669"
              strokeWidth="3.5"
              markerEnd="url(#arrow-correction-light)"
            />

            {/* Callout Badge at Intersection */}
            <g
              transform={`translate(${toSvgX(solution.intersection.x) - 52}, ${
                toSvgY(solution.intersection.y) + 14
              })`}
            >
              <rect
                x="0"
                y="0"
                width="104"
                height="24"
                rx="6"
                fill="#ecfdf5"
                stroke="#10b981"
                strokeWidth="1.5"
              />
              <text x="52" y="10" textAnchor="middle" fill="#047857" fontSize="8" fontWeight="bold">
                CORRECTION VECTOR
              </text>
              <text
                x="52"
                y="20"
                textAnchor="middle"
                fill="#065f46"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {solution.correctionWeight}{config.massUnit} @ {solution.correctionAngleDeg}°
              </text>
            </g>

            {/* Center Origin Hub */}
            <circle cx={center} cy={center} r="6" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
            <circle cx={center} cy={center} r="2.5" fill="#38bdf8" />
          </svg>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600 shrink-0" />
            <div>
              <strong className="text-slate-800 block">"O" Polar Circle</strong>
              <span className="text-[11px] text-slate-500 font-mono">{solution.o} mils radius</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-sky-600 shrink-0" />
            <div>
              <strong className="text-slate-800 block">T1 on "O" Circle</strong>
              <span className="text-[11px] text-slate-500 font-mono">r = {solution.ot1} mils</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-600 shrink-0" />
            <div>
              <strong className="text-slate-800 block">T2 on "O" Circle</strong>
              <span className="text-[11px] text-slate-500 font-mono">r = {solution.ot2} mils</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
            <div>
              <strong className="text-slate-800 block">Intersection Vector</strong>
              <span className="text-[11px] text-emerald-700 font-mono font-bold">
                {solution.correctionWeight}{config.massUnit} @ {solution.correctionAngleDeg}°
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Table of All 4 Runs in MILS */}
      <div className="bg-white border border-slate-300 rounded-2xl p-5 md:p-6 space-y-3 shadow-md shadow-slate-200/60 ring-1 ring-slate-900/5">
        <h2 className="text-sm font-bold text-slate-900">
          Four-Run Measurement Summary (in mils)
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2 px-3">Run</th>
                <th className="py-2 px-3">Description</th>
                <th className="py-2 px-3">Phase Angle</th>
                <th className="py-2 px-3 text-right">Magnitude (mils)</th>
                <th className="py-2 px-3 text-right">Running Speed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((r) => (
                <tr key={r.type} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-cyan-800">{r.type}</td>
                  <td className="py-2.5 px-3 text-slate-800 font-sans">{r.title}</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {r.type === 'O' ? '—' : `${r.phaseAngleDeg}°`}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {r.amplitudeMils.toFixed(2)} mils
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500">
                    {r.frequencyHz > 0 ? `${r.frequencyHz.toFixed(1)} Hz (${r.runningRpm} RPM)` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBackToRuns}
          className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs text-slate-700 font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Run Measurements</span>
        </button>

        <button
          onClick={onResetBalancing}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer shadow-md active:scale-95"
        >
          Start New Rotor Balance
        </button>
      </div>
    </div>
  );
};
