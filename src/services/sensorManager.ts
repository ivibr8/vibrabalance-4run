import { VibrationSample } from '../types/balancing';

export interface SensorManagerCallbacks {
  onSample?: (sample: VibrationSample) => void;
  onStatusChange?: (status: 'unsupported' | 'idle' | 'prompt_needed' | 'recording' | 'error', message?: string) => void;
  onSampleRateDetected?: (rateHz: number) => void;
}

export class SensorManager {
  private isRecording = false;
  private samples: VibrationSample[] = [];
  private callbacks: SensorManagerCallbacks = {};
  private simulatedInterval: number | null = null;
  private motionHandler: ((event: DeviceMotionEvent) => void) | null = null;
  private targetDurationMs = 4000;
  private recordingStartMs = 0;
  private detectedSampleRate = 100;
  private lastSampleTimestamp = 0;
  private intervals: number[] = [];

  constructor(callbacks: SensorManagerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public getDetectedSampleRate(): number {
    return this.detectedSampleRate;
  }

  public isSensorSupported(): boolean {
    return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  }

  public isPermissionRequired(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function'
    );
  }

  public async requestPermission(): Promise<boolean> {
    if (this.isPermissionRequired()) {
      try {
        const reqFn = (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission;
        const res = await reqFn();
        if (res === 'granted') {
          return true;
        } else {
          this.callbacks.onStatusChange?.('error', 'Motion sensor permission was denied in iOS settings.');
          return false;
        }
      } catch (err) {
        this.callbacks.onStatusChange?.('error', 'Could not request motion sensor permission.');
        return false;
      }
    }
    return true;
  }

  public startRecording(
    durationMs: number = 4000,
    onComplete?: (samples: VibrationSample[]) => void,
    simulationConfig?: { runType: 'O' | 'O+T1' | 'O+T2' | 'O+T3'; baseRpm: number }
  ): Promise<VibrationSample[]> {
    this.targetDurationMs = durationMs;
    this.samples = [];
    this.intervals = [];
    this.recordingStartMs = performance.now();
    this.isRecording = true;

    return new Promise((resolve) => {
      const handleDone = () => {
        this.stopRecording();
        const result = [...this.samples];
        onComplete?.(result);
        resolve(result);
      };

      if (simulationConfig) {
        this.startSimulation(simulationConfig.runType, simulationConfig.baseRpm, handleDone);
        this.callbacks.onStatusChange?.('recording', 'Simulating rotor vibration...');
        return;
      }

      if (!this.isSensorSupported()) {
        this.callbacks.onStatusChange?.('error', 'Hardware accelerometer not supported on this browser.');
        // Fallback to simulation
        this.startSimulation('O', 1800, handleDone);
        return;
      }

      this.callbacks.onStatusChange?.('recording', 'Acquiring physical accelerometer data...');

      this.motionHandler = (event: DeviceMotionEvent) => {
        if (!this.isRecording) return;

        const now = performance.now();
        if (this.lastSampleTimestamp > 0) {
          const dt = now - this.lastSampleTimestamp;
          if (dt > 2 && dt < 100) {
            this.intervals.push(dt);
            if (this.intervals.length > 20) {
              const avgDt = this.intervals.reduce((a, b) => a + b, 0) / this.intervals.length;
              const rate = Math.round(1000 / avgDt);
              if (rate > 20 && rate < 500) {
                this.detectedSampleRate = rate;
                this.callbacks.onSampleRateDetected?.(rate);
              }
            }
          }
        }
        this.lastSampleTimestamp = now;

        const acc =
          event.acceleration?.x !== null && event.acceleration?.x !== undefined
            ? event.acceleration
            : event.accelerationIncludingGravity;

        const x = acc?.x ?? 0;
        const y = acc?.y ?? 0;
        const z = acc?.z ?? 0;
        const magnitude = Math.hypot(x, y, z);

        const sample: VibrationSample = {
          timestamp: now,
          x,
          y,
          z,
          magnitude,
        };

        this.samples.push(sample);
        this.callbacks.onSample?.(sample);

        if (now - this.recordingStartMs >= this.targetDurationMs) {
          handleDone();
        }
      };

      window.addEventListener('devicemotion', this.motionHandler, { passive: true });

      setTimeout(() => {
        if (this.isRecording) {
          handleDone();
        }
      }, this.targetDurationMs + 400);
    });
  }

  public stopRecording() {
    this.isRecording = false;
    if (this.motionHandler) {
      window.removeEventListener('devicemotion', this.motionHandler);
      this.motionHandler = null;
    }
    if (this.simulatedInterval !== null) {
      window.clearInterval(this.simulatedInterval);
      this.simulatedInterval = null;
    }
    this.callbacks.onStatusChange?.('idle');
  }

  /**
   * Generates realistic simulated rotor unbalance signals in mils:
   * Target amplitudes:
   * O: 3.5 mils
   * O+T1: 5.8 mils
   * O+T2: 2.1 mils
   * O+T3: 4.4 mils
   */
  private startSimulation(
    runType: 'O' | 'O+T1' | 'O+T2' | 'O+T3',
    baseRpm: number,
    onDone: () => void
  ) {
    const f1X = baseRpm / 60; // e.g. 1800 RPM = 30 Hz
    const sampleRateHz = 120;
    const dtMs = 1000 / sampleRateHz;
    let tSec = 0;

    // Convert target mils pk-pk to equivalent acceleration:
    // a_pk = mils_pk_pk * (omega^2) / 78740.157
    const omega = 2 * Math.PI * f1X;
    const targetMilsMap = {
      'O': 3.5,
      'O+T1': 5.8,
      'O+T2': 2.1,
      'O+T3': 4.4,
    };

    const targetMils = targetMilsMap[runType];
    const targetAcc = (targetMils * omega * omega) / 78740.157;

    this.simulatedInterval = window.setInterval(() => {
      if (!this.isRecording) return;

      tSec += dtMs / 1000;
      const angle = omega * tSec;

      // 1X unbalance + 2X harmonic + low noise
      const sig1X = targetAcc * Math.sin(angle);
      const sig2X = targetAcc * 0.15 * Math.sin(2 * angle + 0.5);
      const noise = (Math.random() - 0.5) * targetAcc * 0.08;

      const total = sig1X + sig2X + noise;

      const sample: VibrationSample = {
        timestamp: performance.now(),
        x: total * 0.9,
        y: total * 0.4,
        z: total * 0.1,
        magnitude: Math.abs(total),
      };

      this.samples.push(sample);
      this.callbacks.onSample?.(sample);

      if (performance.now() - this.recordingStartMs >= this.targetDurationMs) {
        onDone();
      }
    }, dtMs);
  }
}
