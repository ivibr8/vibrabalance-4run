import React from 'react';
import { BalancingConfig } from '../types/balancing';
import { Compass, Sparkles, ArrowRight, RotateCw, RotateCcw, Info, Smartphone } from 'lucide-react';
import { AxisOrientationGuide } from './AxisOrientationGuide';

interface Props {
  config: BalancingConfig;
  onUpdateConfig: (newConfig: BalancingConfig) => void;
  onStartProcedure: () => void;
  onLoadDemoData: () => void;
  isSimulatorMode: boolean;
  onToggleSimulator: (val: boolean) => void;
  onOpenInstallModal?: () => void;
}

export const MethodologyScreen: React.FC<Props> = ({
  config,
  onUpdateConfig,
  onStartProcedure,
  onLoadDemoData,
  isSimulatorMode,
  onToggleSimulator,
  onOpenInstallModal,
}) => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2">
      {/* Mobile Download/Install Notice Banner */}
      <div className="bg-gradient-to-r from-cyan-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md ring-1 ring-slate-900/10">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Test On Your Android Phone</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-cyan-400 text-slate-950 px-2 py-0.5 rounded-full">
                Native PWA
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Install directly to your Android home screen via Chrome — no app store or APK sideloading required.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenInstallModal}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer shrink-0 active:scale-95"
        >
          <span>Get Phone Link & QR Code</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Title & Introduction */}
      <div className="text-center space-y-2.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-semibold">
          <Compass className="w-3.5 h-3.5 text-cyan-600" />
          <span>Single-Plane Dynamic Balancing</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
          Four-Run No-Phase Dynamic Rotor Balancing
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          Balance rotating machinery without an optical tachometer or phase reference by taking four vibration measurements in <strong>mils</strong>.
        </p>
      </div>

      {/* Methodology Visual Breakdown */}
      <div className="bg-white border border-slate-300 rounded-2xl p-5 md:p-6 space-y-4 shadow-md shadow-slate-200/60 ring-1 ring-slate-900/5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-700">
          How the 4-Run Method Works
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Step 1: O */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-base text-red-600">Run "O"</span>
              <span className="text-[11px] text-slate-500 font-mono">Baseline</span>
            </div>
            <strong className="text-slate-800 block">Original As-Is Unbalance</strong>
            <p className="text-slate-600 text-[11px] leading-normal">
              Machine runs in its original state without trial weights. Measures initial 1X vibration amplitude (in mils).
            </p>
          </div>

          {/* Step 2: O+T1 */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-base text-sky-700">Run "O+T1"</span>
              <span className="text-[11px] text-slate-500 font-mono">Phase 1 ({config.t1AngleDeg}°)</span>
            </div>
            <strong className="text-slate-800 block">Baseline + Trial Mass #1</strong>
            <p className="text-slate-600 text-[11px] leading-normal">
              Mount known trial mass at Phase 1 reference position. Measures net combined vibration response.
            </p>
          </div>

          {/* Step 3: O+T2 */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-base text-purple-700">Run "O+T2"</span>
              <span className="text-[11px] text-slate-500 font-mono">Phase 2 ({config.t2AngleDeg}°)</span>
            </div>
            <strong className="text-slate-800 block">Baseline + Trial Mass #2</strong>
            <p className="text-slate-600 text-[11px] leading-normal">
              Move trial mass to Phase 2 (nominally 120° apart). Measures second vector response.
            </p>
          </div>

          {/* Step 4: O+T3 */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-base text-amber-700">Run "O+T3"</span>
              <span className="text-[11px] text-slate-500 font-mono">Phase 3 ({config.t3AngleDeg}°)</span>
            </div>
            <strong className="text-slate-800 block">Baseline + Trial Mass #3</strong>
            <p className="text-slate-600 text-[11px] leading-normal">
              Move trial mass to Phase 3 (nominally 240° apart). Measures third vector response.
            </p>
          </div>
        </div>

        {/* Polar Plot Explanation */}
        <div className="bg-cyan-50/70 border border-cyan-200/80 rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
          <Info className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 leading-relaxed">
            The final screen constructs a polar plot with the <strong>"O"</strong> circle. From the three trial mass locations on that circle, three run circles are drawn based on their measured magnitudes. Their <strong>intersection point</strong> yields the exact vector required to calculate the correction weight and placement angle.
          </div>
        </div>
      </div>

      {/* Machine & Trial Mass Parameters Setup */}
      <div className="bg-white border border-slate-300 rounded-2xl p-5 md:p-6 space-y-4 shadow-md shadow-slate-200/60 ring-1 ring-slate-900/5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Machine & Trial Weight Parameters
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Trial Mass */}
          <div>
            <label className="text-slate-700 block mb-1.5 font-medium">Trial Weight Mass (W_T):</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={config.trialMass}
                onChange={(e) =>
                  onUpdateConfig({ ...config, trialMass: Math.max(0.01, parseFloat(e.target.value) || 0) })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:border-cyan-600"
              />
              <select
                value={config.massUnit}
                onChange={(e) =>
                  onUpdateConfig({ ...config, massUnit: e.target.value as 'g' | 'oz' })
                }
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-mono focus:bg-white focus:outline-none focus:border-cyan-600"
              >
                <option value="oz">ounces (oz)</option>
                <option value="g">grams (g)</option>
              </select>
            </div>
          </div>

          {/* Operating Speed */}
          <div>
            <label className="text-slate-700 block mb-1.5 font-medium">Nominal Operating Speed (RPM):</label>
            <input
              type="number"
              step="10"
              min="100"
              max="10000"
              value={config.nominalRpm}
              onChange={(e) =>
                onUpdateConfig({ ...config, nominalRpm: Math.max(100, parseInt(e.target.value) || 1800) })
              }
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:border-cyan-600"
            />
            <span className="text-[11px] text-slate-500 mt-1 block font-mono">
              Running frequency 1X: {(config.nominalRpm / 60).toFixed(2)} Hz
            </span>
          </div>

          {/* Rotation Direction */}
          <div>
            <label className="text-slate-700 block mb-1.5 font-medium">Direction of Rotation:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateConfig({ ...config, rotationDirection: 'CW' })}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  config.rotationDirection === 'CW'
                    ? 'bg-cyan-50 border-cyan-500 text-cyan-800 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Clockwise (CW)</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateConfig({ ...config, rotationDirection: 'CCW' })}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  config.rotationDirection === 'CCW'
                    ? 'bg-cyan-50 border-cyan-500 text-cyan-800 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>CCW</span>
              </button>
            </div>
          </div>

          {/* Phase Angles Setup */}
          <div>
            <label className="text-slate-700 block mb-1.5 font-medium">Trial Phase Angles (°):</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">T1 Angle</span>
                <input
                  type="number"
                  min="0"
                  max="359"
                  value={config.t1AngleDeg}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, t1AngleDeg: parseInt(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-center font-mono text-xs text-sky-800 font-bold focus:bg-white focus:outline-none focus:border-cyan-600"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">T2 Angle</span>
                <input
                  type="number"
                  min="0"
                  max="359"
                  value={config.t2AngleDeg}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, t2AngleDeg: parseInt(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-center font-mono text-xs text-purple-800 font-bold focus:bg-white focus:outline-none focus:border-cyan-600"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">T3 Angle</span>
                <input
                  type="number"
                  min="0"
                  max="359"
                  value={config.t3AngleDeg}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, t3AngleDeg: parseInt(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-center font-mono text-xs text-amber-800 font-bold focus:bg-white focus:outline-none focus:border-cyan-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Smartphone Accelerometer Axis Orientation & Selector */}
        <div className="pt-3 border-t border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-cyan-600" />
              <span>Smartphone Accelerometer Sensing Axis (Default: Triaxial 3D RSS)</span>
            </h3>
          </div>
          <AxisOrientationGuide
            selectedAxis={config.sensorAxis}
            onSelectAxis={(axis) => onUpdateConfig({ ...config, sensorAxis: axis })}
            compact
          />
        </div>

        {/* Simulator mode option */}
        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700">
            <input
              type="checkbox"
              checked={isSimulatorMode}
              onChange={(e) => onToggleSimulator(e.target.checked)}
              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
            />
            <span>Synthetic Machine Simulator Mode (generate simulated vibration data)</span>
          </label>

          <button
            type="button"
            onClick={onLoadDemoData}
            className="text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Load Calibration Example (1 oz)</span>
          </button>
        </div>
      </div>

      {/* Start Button */}
      <div className="pt-1">
        <button
          onClick={onStartProcedure}
          className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer active:scale-[0.99]"
        >
          <span>Begin Run 1: Baseline "O" Measurement</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
