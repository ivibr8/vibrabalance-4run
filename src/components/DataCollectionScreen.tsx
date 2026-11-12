import React, { useState, useMemo } from 'react';
import { FFTResult, RunData, SpectrumPeak, BalancingConfig } from '../types/balancing';
import {
  Smartphone,
  CheckCircle2,
  Crosshair,
  ArrowRight,
  ArrowLeft,
  Activity,
} from 'lucide-react';

interface Props {
  run: RunData;
  runIndex: number;
  config: BalancingConfig;
  fftResult: FFTResult | null;
  isAcquiring: boolean;
  acquisitionProgress: number;
  onStartAcquisition: () => void;
  onKeepMeasurement: (amplitudeMils: number, frequencyHz: number) => void;
  onUpdateManualMils: (amplitudeMils: number) => void;
  onUpdatePhaseAngle: (deg: number) => void;
  onNextScreen: () => void;
  onPrevScreen: () => void;
  isSimulatorMode: boolean;
  maxPhoneSampleRate: number;
}

export const DataCollectionScreen: React.FC<Props> = ({
  run,
  runIndex,
  config,
  fftResult,
  isAcquiring,
  acquisitionProgress,
  onStartAcquisition,
  onKeepMeasurement,
  onUpdateManualMils,
  onUpdatePhaseAngle,
  onNextScreen,
  onPrevScreen,
  isSimulatorMode,
  maxPhoneSampleRate,
}) => {
  const nyquistHz = Math.floor(maxPhoneSampleRate / 2);

  const spanOptions = useMemo(() => {
    const defaultSpans = [30, 60, 100, nyquistHz];
    const valid = Array.from(new Set(defaultSpans.filter((s) => s > 15 && s <= nyquistHz)));
    valid.sort((a, b) => a - b);
    return valid;
  }, [nyquistHz]);

  const [selectedSpanHz, setSelectedSpanHz] = useState<number>(() => {
    return spanOptions.includes(60) ? 60 : spanOptions[spanOptions.length - 1] || 60;
  });

  const [activePeak, setActivePeak] = useState<SpectrumPeak | null>(null);

  React.useEffect(() => {
    if (fftResult && fftResult.dominantPeak) {
      const targetHz = config.nominalRpm / 60;
      const nearRunning = fftResult.peaks.find(
        (p) => Math.abs(p.frequencyHz - targetHz) < targetHz * 0.15
      );
      setActivePeak(nearRunning || fftResult.dominantPeak);
    }
  }, [fftResult, config.nominalRpm]);

  const filteredData = useMemo(() => {
    if (!fftResult || fftResult.frequenciesHz.length === 0) return null;

    const indices: number[] = [];
    let maxAmp = 0.1;

    for (let i = 0; i < fftResult.frequenciesHz.length; i++) {
      const f = fftResult.frequenciesHz[i];
      if (f <= selectedSpanHz) {
        indices.push(i);
        if (fftResult.amplitudesMils[i] > maxAmp) {
          maxAmp = fftResult.amplitudesMils[i];
        }
      }
    }

    return {
      indices,
      maxAmp: Math.max(0.5, maxAmp * 1.25),
    };
  }, [fftResult, selectedSpanHz]);

  const svgWidth = 720;
  const svgHeight = 260;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 40;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const getX = (f: number) => padLeft + (f / selectedSpanHz) * plotWidth;
  const getY = (amp: number, maxAmp: number) => {
    const clamped = Math.max(0, Math.min(amp, maxAmp));
    return padTop + plotHeight - (clamped / maxAmp) * plotHeight;
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!fftResult || !filteredData) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const normX = (clickX / rect.width) * svgWidth;

    if (normX >= padLeft && normX <= padLeft + plotWidth) {
      const freq = ((normX - padLeft) / plotWidth) * selectedSpanHz;

      const nearPeak = fftResult.peaks.find((p) => Math.abs(p.frequencyHz - freq) < 2.0);
      if (nearPeak) {
        setActivePeak(nearPeak);
      } else {
        let closestIdx = 0;
        let minDiff = 999;
        for (let i = 0; i < fftResult.frequenciesHz.length; i++) {
          const diff = Math.abs(fftResult.frequenciesHz[i] - freq);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = i;
          }
        }
        setActivePeak({
          frequencyHz: fftResult.frequenciesHz[closestIdx],
          frequencyRpm: fftResult.frequenciesRpm[closestIdx],
          amplitudeMils: fftResult.amplitudesMils[closestIdx],
        });
      }
    }
  };

  const currentSelectionMils = activePeak
    ? activePeak.amplitudeMils
    : run.amplitudeMils > 0
    ? run.amplitudeMils
    : fftResult?.dominantPeak?.amplitudeMils || 0;

  const currentSelectionHz = activePeak
    ? activePeak.frequencyHz
    : run.frequencyHz > 0
    ? run.frequencyHz
    : fftResult?.dominantPeak?.frequencyHz || config.nominalRpm / 60;

  return (
    <div className="max-w-3xl mx-auto space-y-5 py-2">
      {/* Screen Title & Run Description */}
      <div className="bg-white border border-slate-300 rounded-2xl p-5 md:p-6 space-y-3 shadow-md shadow-slate-200/60 ring-1 ring-slate-900/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-50 text-cyan-800 font-mono text-xs font-bold border border-cyan-200">
                Data Collection {runIndex + 1} of 4
              </span>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">{run.title}</h1>
            </div>
            <p className="text-xs text-slate-600 mt-1">{run.subtitle}</p>
          </div>

          {run.type !== 'O' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
              <span className="text-slate-600 font-medium">Phase Location:</span>
              <input
                type="number"
                min="0"
                max="359"
                value={run.phaseAngleDeg}
                onChange={(e) => onUpdatePhaseAngle(parseInt(e.target.value) || 0)}
                className="w-14 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-center font-mono font-bold text-amber-700 text-xs focus:outline-none focus:border-cyan-600"
              />
              <span className="text-slate-500">°</span>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-3">
          <span>
            {run.type === 'O'
              ? 'Run machine as-is without trial weights. Press phone firmly to bearing housing and tap Acquire.'
              : `Mount trial weight (${config.trialMass} ${config.massUnit}) at ${run.phaseAngleDeg}°, bring rotor to running speed, then tap Acquire.`}
          </span>
          {run.isKept && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold text-xs whitespace-nowrap shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Measurement Verified & Kept</span>
            </span>
          )}
        </div>
      </div>

      {/* FFT Spectrum Display in MILS */}
      <div className="bg-white border border-slate-300 rounded-2xl p-5 md:p-6 space-y-4 shadow-md shadow-slate-200/60 ring-1 ring-slate-900/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-700" />
            <span className="text-sm font-bold text-slate-800">Displacement Spectrum (mils pk-pk)</span>
          </div>

          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs">
            <span className="text-slate-500 px-2">Span:</span>
            {spanOptions.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedSpanHz(f)}
                className={`px-2.5 py-1 rounded-lg font-mono font-medium transition-colors cursor-pointer ${
                  selectedSpanHz === f
                    ? 'bg-white text-cyan-800 font-bold shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f}Hz
              </button>
            ))}
          </div>
        </div>

        {/* SVG Spectrum */}
        <div className="relative w-full overflow-hidden bg-white rounded-xl border border-slate-200 shadow-inner">
          {!fftResult ? (
            <div className="flex flex-col items-center justify-center h-60 text-slate-500 text-xs p-6 text-center space-y-2">
              <Activity className="w-8 h-8 stroke-[1.5] text-slate-400 animate-pulse" />
              <p className="font-semibold text-slate-700">No vibration data acquired yet for {run.type}</p>
              <p className="text-[11px] text-slate-500 max-w-sm">
                Tap <strong>Acquire Vibration</strong> below with your smartphone on the bearing, or enter a manual measurement.
              </p>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto cursor-crosshair select-none block"
              onClick={handleSvgClick}
            >
              <defs>
                <linearGradient id={`grad-light-${run.type}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                  <stop offset="80%" stopColor="#0284c7" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Y-axis Grid Lines (Amplitudes in mils) */}
              {[0.25, 0.5, 0.75, 1.0].map((r) => {
                const yVal = getY(filteredData!.maxAmp * r, filteredData!.maxAmp);
                const milsLabel = (filteredData!.maxAmp * r).toFixed(1);
                return (
                  <g key={`y-${r}`}>
                    <line
                      x1={padLeft}
                      y1={yVal}
                      x2={padLeft + plotWidth}
                      y2={yVal}
                      stroke="#f1f5f9"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padLeft - 8}
                      y={yVal + 3}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {milsLabel}
                    </text>
                  </g>
                );
              })}

              {/* X-axis Grid Lines (Frequency Hz & RPM) */}
              {Array.from({ length: 6 }).map((_, idx) => {
                const freq = (selectedSpanHz / 5) * idx;
                const xVal = getX(freq);
                return (
                  <g key={`x-${idx}`}>
                    <line
                      x1={xVal}
                      y1={padTop}
                      x2={xVal}
                      y2={padTop + plotHeight}
                      stroke="#f1f5f9"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={xVal}
                      y={padTop + plotHeight + 16}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {freq} Hz
                    </text>
                    <text
                      x={xVal}
                      y={padTop + plotHeight + 28}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      {Math.round(freq * 60)} RPM
                    </text>
                  </g>
                );
              })}

              {/* Spectrum Curve */}
              {(() => {
                const pts = filteredData!.indices.map((i) => {
                  const x = getX(fftResult.frequenciesHz[i]);
                  const y = getY(fftResult.amplitudesMils[i], filteredData!.maxAmp);
                  return `${x},${y}`;
                });

                const bottom = `${getX(selectedSpanHz)},${padTop + plotHeight} ${getX(0)},${padTop + plotHeight}`;
                return (
                  <>
                    <path
                      d={`M ${getX(0)},${padTop + plotHeight} L ${pts.join(' L ')} L ${bottom} Z`}
                      fill={`url(#grad-light-${run.type})`}
                    />
                    <path
                      d={`M ${pts.join(' L ')}`}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </>
                );
              })()}

              {/* Highlight Active 1X Cursor */}
              {currentSelectionHz && currentSelectionHz <= selectedSpanHz && (
                <g>
                  <line
                    x1={getX(currentSelectionHz)}
                    y1={padTop}
                    x2={getX(currentSelectionHz)}
                    y2={padTop + plotHeight}
                    stroke="#d97706"
                    strokeWidth="1.8"
                    strokeDasharray="3 3"
                  />
                  <rect
                    x={getX(currentSelectionHz) - 16}
                    y={padTop - 2}
                    width="32"
                    height="14"
                    rx="3"
                    fill="#d97706"
                  />
                  <text
                    x={getX(currentSelectionHz)}
                    y={padTop + 8}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    1X
                  </text>
                </g>
              )}

              {/* Peak Dots */}
              {fftResult.peaks.map((peak, idx) => {
                if (peak.frequencyHz > selectedSpanHz) return null;
                const px = getX(peak.frequencyHz);
                const py = getY(peak.amplitudeMils, filteredData!.maxAmp);
                const isSelected = activePeak?.frequencyHz === peak.frequencyHz;

                return (
                  <g key={`pk-${idx}`}>
                    <circle
                      cx={px}
                      cy={py}
                      r={isSelected ? '5' : '3.5'}
                      fill={isSelected ? '#d97706' : '#0284c7'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    {idx < 2 && (
                      <text
                        x={px}
                        y={py - 8}
                        textAnchor="middle"
                        fill={isSelected ? '#b45309' : '#0369a1'}
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {peak.amplitudeMils.toFixed(2)} mils
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Selected Running Speed Amplitude Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <Crosshair className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-slate-700">Identified 1X Running Speed Amplitude:</span>
            </div>
            <div className="flex items-baseline gap-2 justify-center sm:justify-start">
              <span className="text-2xl md:text-3xl font-extrabold text-cyan-800 font-mono">
                {currentSelectionMils.toFixed(2)}
              </span>
              <span className="text-sm font-semibold text-slate-600">mils pk-pk</span>
              <span className="text-xs text-slate-500 font-mono ml-2">
                @ {currentSelectionHz.toFixed(1)} Hz ({Math.round(currentSelectionHz * 60)} RPM)
              </span>
            </div>
          </div>

          {/* KEEP THIS MEASUREMENT BUTTON */}
          <button
            onClick={() => onKeepMeasurement(currentSelectionMils, currentSelectionHz)}
            disabled={currentSelectionMils <= 0}
            className={`w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
              run.isKept
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : currentSelectionMils > 0
                ? 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>{run.isKept ? '✓ Measurement Kept (Click to Update)' : 'Keep This Measurement'}</span>
          </button>
        </div>
      </div>

      {/* Sensor Acquisition Trigger & Manual Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Accelerometer Button */}
        <div className="bg-white border border-slate-300 rounded-2xl p-4 space-y-2 flex flex-col justify-between shadow-md shadow-slate-200/50 ring-1 ring-slate-900/5">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-cyan-600" />
            Smartphone Sensor Acquisition
          </span>
          <button
            onClick={onStartAcquisition}
            disabled={isAcquiring}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
              isAcquiring
                ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-wait animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 cursor-pointer active:scale-98'
            }`}
          >
            <Activity className={`w-4 h-4 ${isAcquiring ? 'animate-spin' : ''}`} />
            <span>{isAcquiring ? 'Acquiring 4s Data...' : `Acquire Vibration for ${run.type}`}</span>
          </button>
          <span className="text-[10px] text-slate-500 text-center">
            {isSimulatorMode ? 'Simulating rotor response' : 'Uses built-in phone accelerometer'}
          </span>
        </div>

        {/* Manual Direct Input */}
        <div className="bg-white border border-slate-300 rounded-2xl p-4 space-y-2 shadow-md shadow-slate-200/50 ring-1 ring-slate-900/5">
          <span className="text-xs font-semibold text-slate-700">Manual Measurement Override:</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={run.amplitudeMils > 0 ? run.amplitudeMils : ''}
              onChange={(e) => onUpdateManualMils(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-right font-mono text-base font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-600"
            />
            <span className="text-xs font-mono font-medium text-slate-600 whitespace-nowrap">
              mils
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            Type vibration directly if already measured via handheld meter
          </span>
        </div>
      </div>

      {/* Screen Navigation Bottom Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
        <button
          onClick={onPrevScreen}
          className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs text-slate-700 font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={onNextScreen}
          disabled={run.amplitudeMils <= 0}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
            run.amplitudeMils > 0
              ? 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>{runIndex === 3 ? 'View Polar Plot & Solution' : 'Next Run'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
