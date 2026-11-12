import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BalancingCalculationResult,
  BalancingConfig,
  FFTResult,
  RunData,
  VibrationSample,
} from './types/balancing';
import { computeFFTInMils, resampleUniform } from './utils/fft';
import { solveFourRunNoPhase } from './utils/balancingSolver';
import { SensorManager } from './services/sensorManager';
import { MethodologyScreen } from './components/MethodologyScreen';
import { DataCollectionScreen } from './components/DataCollectionScreen';
import { PolarPlotScreen } from './components/PolarPlotScreen';
import { InstallModal } from './components/InstallModal';
import {
  Compass,
  CheckCircle2,
  Smartphone,
  Sparkles,
  QrCode,
} from 'lucide-react';

// Pre-loaded with user's exact calibration example:
// "O" = 3.75 mils
// "O+T1" @ 0° = 3.38 mils
// "O+T2" @ 120° = 3.86 mils
// "O+T3" @ 240° = 6.80 mils
// Trial weight = 1.0 oz
// Expected correction weight = approx. 1.17 - 1.18 oz
const INITIAL_CONFIG: BalancingConfig = {
  trialMass: 1.0,
  massUnit: 'oz',
  nominalRpm: 1800,
  rotationDirection: 'CW',
  t1AngleDeg: 0,
  t2AngleDeg: 120,
  t3AngleDeg: 240,
};

const INITIAL_RUNS: RunData[] = [
  {
    type: 'O',
    title: 'Run "O" - Baseline Unbalance',
    subtitle: 'Measured machine as-is unbalance without trial weight.',
    phaseAngleDeg: 0,
    amplitudeMils: 3.75,
    frequencyHz: 30.0,
    runningRpm: 1800,
    isKept: true,
    measuredAt: 'Baseline',
  },
  {
    type: 'O+T1',
    title: 'Run "O+T1" - Trial Weight at Phase 1',
    subtitle: 'Trial weight (1.0 oz) mounted at 0° reference position.',
    phaseAngleDeg: 0,
    amplitudeMils: 3.38,
    frequencyHz: 30.0,
    runningRpm: 1800,
    isKept: true,
    measuredAt: 'Trial #1',
  },
  {
    type: 'O+T2',
    title: 'Run "O+T2" - Trial Weight at Phase 2',
    subtitle: 'Trial weight (1.0 oz) mounted at 120° position.',
    phaseAngleDeg: 120,
    amplitudeMils: 3.86,
    frequencyHz: 30.0,
    runningRpm: 1800,
    isKept: true,
    measuredAt: 'Trial #2',
  },
  {
    type: 'O+T3',
    title: 'Run "O+T3" - Trial Weight at Phase 3',
    subtitle: 'Trial weight (1.0 oz) mounted at 240° position.',
    phaseAngleDeg: 240,
    amplitudeMils: 6.80,
    frequencyHz: 30.0,
    runningRpm: 1800,
    isKept: true,
    measuredAt: 'Trial #3',
  },
];

export default function App() {
  // Screen Index:
  // 0: Methodology & Setup
  // 1: Run "O" (3.75 mils)
  // 2: Run "O+T1" (3.38 mils)
  // 3: Run "O+T2" (3.86 mils)
  // 4: Run "O+T3" (6.80 mils)
  // 5: Polar Plot & Solution (1.18 oz)
  const [currentScreen, setCurrentScreen] = useState<number>(5);

  const [config, setConfig] = useState<BalancingConfig>(INITIAL_CONFIG);
  const [runs, setRuns] = useState<RunData[]>(INITIAL_RUNS);

  const [isSimulatorMode, setIsSimulatorMode] = useState<boolean>(false);
  const [isAcquiring, setIsAcquiring] = useState<boolean>(false);
  const [acquisitionProgress, setAcquisitionProgress] = useState<number>(0);
  const [maxPhoneSampleRate, setMaxPhoneSampleRate] = useState<number>(120);
  const [sensorPermissionNeeded, setSensorPermissionNeeded] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  const generatePresetFft = (mils: number): FFTResult => {
    const freqsHz: number[] = [];
    const freqsRpm: number[] = [];
    const amps: number[] = [];
    for (let i = 0; i < 256; i++) {
      const f = (i * 120) / 512;
      freqsHz.push(f);
      freqsRpm.push(f * 60);
      let a = 0.05 + Math.random() * 0.03;
      if (Math.abs(f - 30.0) < 0.45) a = mils;
      if (Math.abs(f - 60.0) < 0.45) a = mils * 0.12;
      amps.push(Math.round(a * 100) / 100);
    }
    return {
      frequenciesHz: freqsHz,
      frequenciesRpm: freqsRpm,
      amplitudesMils: amps,
      sampleRate: 120,
      durationSec: 4.0,
      resolutionHz: 0.23,
      peaks: [
        { frequencyHz: 30.0, frequencyRpm: 1800, amplitudeMils: mils, isHarmonic: true, harmonicOrder: 1 },
        { frequencyHz: 60.0, frequencyRpm: 3600, amplitudeMils: Math.round(mils * 0.12 * 100) / 100, isHarmonic: true, harmonicOrder: 2 },
      ],
      dominantPeak: { frequencyHz: 30.0, frequencyRpm: 1800, amplitudeMils: mils, isHarmonic: true, harmonicOrder: 1 },
      overallMils: mils,
      maxMils: mils,
    };
  };

  const [runFftResults, setRunFftResults] = useState<{ [key: string]: FFTResult | null }>({
    'O': generatePresetFft(3.75),
    'O+T1': generatePresetFft(3.38),
    'O+T2': generatePresetFft(3.86),
    'O+T3': generatePresetFft(6.80),
  });

  const sensorManagerRef = useRef<SensorManager | null>(null);

  useEffect(() => {
    sensorManagerRef.current = new SensorManager({
      onSampleRateDetected: (rateHz) => {
        setMaxPhoneSampleRate(rateHz);
      },
    });

    if (sensorManagerRef.current.isPermissionRequired()) {
      setSensorPermissionNeeded(true);
    }
  }, []);

  const solution = useMemo<BalancingCalculationResult>(() => {
    return solveFourRunNoPhase(runs, config);
  }, [runs, config]);

  const handleRequestPermission = async () => {
    if (sensorManagerRef.current) {
      const granted = await sensorManagerRef.current.requestPermission();
      if (granted) setSensorPermissionNeeded(false);
    }
  };

  const handleStartAcquisition = (runType: 'O' | 'O+T1' | 'O+T2' | 'O+T3') => {
    if (!sensorManagerRef.current) return;

    setIsAcquiring(true);
    setAcquisitionProgress(0);

    const progressTimer = window.setInterval(() => {
      setAcquisitionProgress((p) => {
        if (p >= 98) {
          window.clearInterval(progressTimer);
          return 98;
        }
        return p + 2.5;
      });
    }, 100);

    const simConfig = isSimulatorMode
      ? { runType, baseRpm: config.nominalRpm }
      : undefined;

    sensorManagerRef.current
      .startRecording(
        4000,
        (samples: VibrationSample[]) => {
          window.clearInterval(progressTimer);
          setAcquisitionProgress(100);
          setIsAcquiring(false);

          if (samples.length >= 8) {
            const targetRate = Math.max(60, maxPhoneSampleRate);
            const { uniformValues } = resampleUniform(samples, targetRate);
            const fft = computeFFTInMils(uniformValues, targetRate, config.nominalRpm);

            setRunFftResults((prev) => ({ ...prev, [runType]: fft }));

            if (fft.dominantPeak) {
              const targetHz = config.nominalRpm / 60;
              const nearRunning = fft.peaks.find(
                (p) => Math.abs(p.frequencyHz - targetHz) < targetHz * 0.15
              ) || fft.dominantPeak;

              setRuns((prev) =>
                prev.map((r) =>
                  r.type === runType
                    ? {
                        ...r,
                        amplitudeMils: nearRunning.amplitudeMils,
                        frequencyHz: nearRunning.frequencyHz,
                        runningRpm: nearRunning.frequencyRpm,
                      }
                    : r
                )
              );
            }
          }
        },
        simConfig
      )
      .catch(() => {
        window.clearInterval(progressTimer);
        setIsAcquiring(false);
      });
  };

  const handleKeepMeasurement = (
    runType: 'O' | 'O+T1' | 'O+T2' | 'O+T3',
    amplitudeMils: number,
    frequencyHz: number
  ) => {
    setRuns((prev) =>
      prev.map((r) =>
        r.type === runType
          ? {
              ...r,
              amplitudeMils: Math.round(amplitudeMils * 100) / 100,
              frequencyHz: Math.round(frequencyHz * 10) / 10,
              runningRpm: Math.round(frequencyHz * 60),
              isKept: true,
              measuredAt: new Date().toLocaleTimeString(),
            }
          : r
      )
    );
  };

  const handleUpdateManualMils = (runType: 'O' | 'O+T1' | 'O+T2' | 'O+T3', mils: number) => {
    setRuns((prev) =>
      prev.map((r) =>
        r.type === runType
          ? {
              ...r,
              amplitudeMils: mils,
              frequencyHz: r.frequencyHz || config.nominalRpm / 60,
              runningRpm: r.runningRpm || config.nominalRpm,
              isKept: mils > 0,
            }
          : r
      )
    );
  };

  const handleUpdatePhaseAngle = (runType: 'O+T1' | 'O+T2' | 'O+T3', deg: number) => {
    setRuns((prev) =>
      prev.map((r) => (r.type === runType ? { ...r, phaseAngleDeg: deg } : r))
    );
    if (runType === 'O+T1') setConfig((c) => ({ ...c, t1AngleDeg: deg }));
    if (runType === 'O+T2') setConfig((c) => ({ ...c, t2AngleDeg: deg }));
    if (runType === 'O+T3') setConfig((c) => ({ ...c, t3AngleDeg: deg }));
  };

  const handleResetBalancing = () => {
    setRuns(INITIAL_RUNS);
    setConfig(INITIAL_CONFIG);
    setCurrentScreen(0);
  };

  const handleReloadUserExample = () => {
    setRuns(INITIAL_RUNS);
    setConfig(INITIAL_CONFIG);
    setRunFftResults({
      'O': generatePresetFft(3.75),
      'O+T1': generatePresetFft(3.38),
      'O+T2': generatePresetFft(3.86),
      'O+T3': generatePresetFft(6.80),
    });
    setCurrentScreen(5);
  };

  const screenSteps = [
    { id: 0, label: 'Methodology' },
    { id: 1, label: 'Run "O" (3.75)' },
    { id: 2, label: 'O+T1 (3.38)' },
    { id: 3, label: 'O+T2 (3.86)' },
    { id: 4, label: 'O+T3 (6.80)' },
    { id: 5, label: 'Polar Plot (1.18 oz)' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-cyan-500/25">
      {/* Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-300 px-4 md:px-8 py-3 flex items-center justify-between gap-6 shrink-0 shadow-xs ring-1 ring-slate-900/5">
        {/* Zone 1: Wordmark */}
        <button
          onClick={() => setCurrentScreen(0)}
          className="text-base md:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
        >
          <Compass className="w-5 h-5 text-cyan-600 shrink-0" />
          <span>VibraBalance 4-Run</span>
        </button>

        {/* Zone 2: Step Navigation */}
        <nav className="hidden md:flex items-center gap-2.5 text-xs font-medium text-slate-600">
          {screenSteps.map((s) => {
            const isActive = currentScreen === s.id;
            const isCompleted =
              s.id === 0 ||
              (s.id >= 1 && s.id <= 4 && runs[s.id - 1].isKept) ||
              (s.id === 5 && solution.isValid);

            return (
              <button
                key={s.id}
                onClick={() => setCurrentScreen(s.id)}
                className={`transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer py-1.5 px-2.5 rounded-lg ${
                  isActive
                    ? 'bg-cyan-50 text-cyan-800 font-bold border border-cyan-300 shadow-2xs'
                    : isCompleted
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {isCompleted && s.id > 0 && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className="px-3 py-1.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 border border-cyan-500 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs cursor-pointer active:scale-95"
            title="Scan QR or install on Android phone"
          >
            <Smartphone className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Test on Android</span>
            <span className="sm:hidden">Install</span>
          </button>

          <button
            onClick={handleReloadUserExample}
            className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs cursor-pointer active:scale-95"
            title="Reload 3.75 mils / 1 oz calibration example"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden md:inline">Reload Example</span>
          </button>
        </div>
      </header>

      {/* Mobile Top Stepper Strip */}
      <div className="md:hidden bg-white border-b border-slate-300 px-3 py-2 flex items-center justify-between text-[11px] font-mono shadow-2xs">
        <span className="text-slate-600">
          Screen {currentScreen + 1} of 6: <strong className="text-cyan-800">{screenSteps[currentScreen].label}</strong>
        </span>
        <div className="flex items-center gap-1">
          {screenSteps.map((s) => (
            <button
              key={s.id}
              onClick={() => setCurrentScreen(s.id)}
              className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors ${
                currentScreen === s.id
                  ? 'bg-slate-900 text-white'
                  : s.id > 0 && runs[s.id - 1]?.isKept
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {s.id + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="bg-slate-200/80 border-b border-slate-300 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 text-slate-800">
          <span className="font-semibold text-slate-600">Current Runs:</span>
          <span className="font-mono">"O" = <strong className="text-red-700">{runs[0].amplitudeMils} mils</strong></span>
          <span className="text-slate-400">·</span>
          <span className="font-mono">"O+T1" = <strong className="text-sky-800">{runs[1].amplitudeMils} mils @ {runs[1].phaseAngleDeg}°</strong></span>
          <span className="text-slate-400">·</span>
          <span className="font-mono">"O+T2" = <strong className="text-purple-800">{runs[2].amplitudeMils} mils @ {runs[2].phaseAngleDeg}°</strong></span>
          <span className="text-slate-400">·</span>
          <span className="font-mono">"O+T3" = <strong className="text-amber-800">{runs[3].amplitudeMils} mils @ {runs[3].phaseAngleDeg}°</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-600 font-mono">W_T = {config.trialMass} {config.massUnit}</span>
          {solution.isValid && (
            <button
              onClick={() => setCurrentScreen(5)}
              className="px-2.5 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold font-mono text-[11px] hover:bg-emerald-200 transition-colors"
            >
              Correction: {solution.correctionWeight} {config.massUnit} ({solution.correctionAngleDeg}°)
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 space-y-4">
        {/* iOS Sensor Permission Banner if needed */}
        {sensorPermissionNeeded && (
          <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-cyan-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-cyan-600 shrink-0" />
              <span>Motion sensors require iOS Safari permission to measure accelerometer vibration.</span>
            </div>
            <button
              onClick={handleRequestPermission}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              Enable Sensors
            </button>
          </div>
        )}

        {/* Live Acquisition Overlay Banner */}
        {isAcquiring && (
          <div className="bg-white border border-cyan-400 rounded-xl p-4 shadow-md space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-cyan-800">
                Acquiring 4-Second Vibration Data...
              </span>
              <span className="font-mono font-bold text-slate-800">
                {Math.round(acquisitionProgress)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 to-emerald-500 transition-all duration-100"
                style={{ width: `${acquisitionProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Hold phone firmly against machine bearing housing until complete
            </p>
          </div>
        )}

        {/* Screen 0: Methodology & Setup */}
        {currentScreen === 0 && (
          <MethodologyScreen
            config={config}
            onUpdateConfig={setConfig}
            onStartProcedure={() => setCurrentScreen(1)}
            onLoadDemoData={handleReloadUserExample}
            isSimulatorMode={isSimulatorMode}
            onToggleSimulator={setIsSimulatorMode}
            onOpenInstallModal={() => setIsInstallModalOpen(true)}
          />
        )}

        {/* Screens 1 to 4: The 4 Data Collection Screens */}
        {currentScreen >= 1 && currentScreen <= 4 && (() => {
          const runIdx = currentScreen - 1;
          const currentRun = runs[runIdx];

          return (
            <DataCollectionScreen
              key={currentRun.type}
              run={currentRun}
              runIndex={runIdx}
              config={config}
              fftResult={runFftResults[currentRun.type]}
              isAcquiring={isAcquiring}
              acquisitionProgress={acquisitionProgress}
              onStartAcquisition={() => handleStartAcquisition(currentRun.type)}
              onKeepMeasurement={(amp, freq) =>
                handleKeepMeasurement(currentRun.type, amp, freq)
              }
              onUpdateManualMils={(mils) => handleUpdateManualMils(currentRun.type, mils)}
              onUpdatePhaseAngle={(deg) =>
                handleUpdatePhaseAngle(currentRun.type as 'O+T1' | 'O+T2' | 'O+T3', deg)
              }
              onNextScreen={() => setCurrentScreen(currentScreen + 1)}
              onPrevScreen={() => setCurrentScreen(currentScreen - 1)}
              isSimulatorMode={isSimulatorMode}
              maxPhoneSampleRate={maxPhoneSampleRate}
            />
          );
        })()}

        {/* Screen 5: Final Polar Plot & Correction Weight Solution */}
        {currentScreen === 5 && (
          <PolarPlotScreen
            solution={solution}
            config={config}
            runs={runs}
            onBackToRuns={() => setCurrentScreen(4)}
            onResetBalancing={handleResetBalancing}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-300 bg-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
        <p className="font-medium text-slate-600">VibraBalance 4-Run · Single-Plane No-Phase Dynamic Balancing · Units in Mils</p>
        <button
          onClick={() => setIsInstallModalOpen(true)}
          className="text-cyan-700 hover:text-cyan-800 font-bold flex items-center gap-1.5 cursor-pointer hover:underline"
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-600" />
          <span>Open on Android / Scan QR Code</span>
        </button>
      </footer>

      {/* Android/Mobile PWA Install Modal */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        maxPhoneSampleRate={maxPhoneSampleRate}
      />
    </div>
  );
}
