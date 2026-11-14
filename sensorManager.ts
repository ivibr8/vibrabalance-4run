import { VibrationSample } from '../types/balancing';

export interface SensorManagerCallbacks {
  onSample?: (sample: VibrationSample) => void;
  onStatusChange?: (
    status: 'unsupported' | 'idle' | 'prompt_needed' | 'recording' | 'error',
    message?: string
  ) => void;
  onSampleRateDetected?: (rateHz: number) => void;
}

export class SensorManager {
  private isRecording = false;
  private samples: VibrationSample[] = [];
  private callbacks: SensorManagerCallbacks = {};
  private simulatedInterval: number | null = null;
  private motionHandler: ((event: DeviceMotionEvent) => void) | null = null;
  private genericSensor: { stop: () => void } | null = null;
  private targetDurationMs = 4000;
  private recordingStartMs = 0;
  private detectedSampleRate = 60;
  private lastSampleTimestamp = 0;
  private intervals: number[] = [];
  private activeSource = 'DeviceMotion (Raw Accel)';
  private fallbackTimer: number | null = null;
  private finishTimer: number | null = null;

  constructor(callbacks: SensorManagerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public getDetectedSampleRate(): number {
    return this.detectedSampleRate;
  }

  public getActiveSource(): string {
    return this.activeSource;
  }

  public isSensorSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('DeviceMotionEvent' in window || 'Accelerometer' in window)
    );
  }

  public isPermissionRequired(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> })
        .requestPermission === 'function'
    );
  }

  public async requestPermission(): Promise<boolean> {
    if (this.isPermissionRequired()) {
      try {
        const reqFn = (
          DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }
        ).requestPermission;
        const res = await reqFn();
        if (res === 'granted') {
          return true;
        } else {
          this.callbacks.onStatusChange?.(
            'error',
            'Motion sensor permission was denied in iOS settings.'
          );
          return false;
        }
      } catch {
        this.callbacks.onStatusChange?.(
          'error',
          'Could not request motion sensor permission.'
        );
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
    this.stopRecording();

    this.targetDurationMs = durationMs;
    this.samples = [];
    this.intervals = [];
    this.lastSampleTimestamp = 0;
    this.recordingStartMs = performance.now();
    this.isRecording = true;

    return new Promise((resolve) => {
      let completed = false;

      const handleDone = () => {
        if (completed) return;
        completed = true;

        // Compute true measured sample rate over the full recording window
        if (this.samples.length >= 8) {
          const spanSec =
            (this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp) /
            1000;
          if (spanSec > 0.2) {
            const actualRate = Math.round((this.samples.length - 1) / spanSec);
            if (actualRate >= 10 && actualRate <= 1000) {
              this.detectedSampleRate = actualRate;
              this.callbacks.onSampleRateDetected?.(actualRate);
            }
          }
        }

        const result = [...this.samples];
        this.stopRecording();
        onComplete?.(result);
        resolve(result);
      };

      if (simulationConfig) {
        this.activeSource = 'Synthetic Simulator (240 Hz)';
        this.detectedSampleRate = 240;
        this.callbacks.onSampleRateDetected?.(240);
        this.startSimulation(simulationConfig.runType, simulationConfig.baseRpm, handleDone);
        this.callbacks.onStatusChange?.('recording', 'Simulating rotor vibration...');
        return;
      }

      if (!this.isSensorSupported()) {
        this.callbacks.onStatusChange?.(
          'error',
          'Hardware accelerometer not supported on this browser.'
        );
        this.activeSource = 'Simulator Fallback (240 Hz)';
        this.startSimulation('O', 1800, handleDone);
        return;
      }

      this.callbacks.onStatusChange?.(
        'recording',
        'Acquiring physical accelerometer data...'
      );

      // Try Generic Sensor API (Accelerometer @ 240 Hz request) on Android Chrome first,
      // with automatic fast fallback to DeviceMotionEvent if unavailable or blocked.
      const startedGeneric = this.tryStartGenericAccelerometer(handleDone, () => {
        // Fallback if Generic Sensor API errors or produces no samples within 300ms
        if (this.isRecording && this.samples.length === 0) {
          this.startDeviceMotionListener(handleDone);
        }
      });

      if (!startedGeneric) {
        this.startDeviceMotionListener(handleDone);
      }

      this.finishTimer = window.setTimeout(() => {
        if (this.isRecording) {
          handleDone();
        }
      }, this.targetDurationMs + 450);
    });
  }

  private recordSample(now: number, x: number, y: number, z: number, handleDone: () => void) {
    if (!this.isRecording) return;

    if (this.lastSampleTimestamp > 0) {
      const dt = now - this.lastSampleTimestamp;
      if (dt > 1 && dt < 200) {
        this.intervals.push(dt);
        if (this.intervals.length > 20 && this.intervals.length % 10 === 0) {
          const avgDt =
            this.intervals.reduce((a, b) => a + b, 0) / this.intervals.length;
          const rate = Math.round(1000 / avgDt);
          if (rate >= 10 && rate <= 1000) {
            this.detectedSampleRate = rate;
            this.callbacks.onSampleRateDetected?.(rate);
          }
        }
      }
    }
    this.lastSampleTimestamp = now;

    const sample: VibrationSample = {
      timestamp: now,
      x,
      y,
      z,
      magnitude: Math.hypot(x, y, z),
    };

    this.samples.push(sample);
    this.callbacks.onSample?.(sample);

    if (now - this.recordingStartMs >= this.targetDurationMs) {
      handleDone();
    }
  }

  private tryStartGenericAccelerometer(
    handleDone: () => void,
    onFallbackNeeded: () => void
  ): boolean {
    if (typeof window === 'undefined' || !('Accelerometer' in window)) {
      return false;
    }

    try {
      type AccelSensorCtor = new (opts?: { frequency?: number }) => {
        x: number | null;
        y: number | null;
        z: number | null;
        timestamp: number | null;
        start: () => void;
        stop: () => void;
        addEventListener: (type: string, listener: (ev?: unknown) => void) => void;
      };

      const AccelerometerCtor = (window as unknown as { Accelerometer: AccelSensorCtor })
        .Accelerometer;
      const sensor = new AccelerometerCtor({ frequency: 240 });
      let receivedReading = false;

      sensor.addEventListener('reading', () => {
        if (!this.isRecording) return;
        receivedReading = true;
        this.activeSource = 'Hardware Accelerometer API';
        const now =
          typeof sensor.timestamp === 'number' && sensor.timestamp > 0
            ? sensor.timestamp
            : performance.now();
        this.recordSample(
          now,
          sensor.x ?? 0,
          sensor.y ?? 0,
          sensor.z ?? 0,
          handleDone
        );
      });

      sensor.addEventListener('error', () => {
        try {
          sensor.stop();
        } catch {
          // ignore
        }
        this.genericSensor = null;
        if (!receivedReading) {
          onFallbackNeeded();
        }
      });

      sensor.start();
      this.genericSensor = sensor;

      // If no readings arrive within 300ms (e.g. blocked by Permissions-Policy), switch to DeviceMotion
      this.fallbackTimer = window.setTimeout(() => {
        if (this.isRecording && !receivedReading) {
          try {
            sensor.stop();
          } catch {
            // ignore
          }
          this.genericSensor = null;
          onFallbackNeeded();
        }
      }, 300);

      return true;
    } catch {
      return false;
    }
  }

  private startDeviceMotionListener(handleDone: () => void) {
    this.activeSource = 'DeviceMotion (Raw Accel)';
    this.motionHandler = (event: DeviceMotionEvent) => {
      if (!this.isRecording) return;

      const now = performance.now();

      // Prefer accelerationIncludingGravity because it comes directly from the raw MEMS
      // accelerometer without OS sensor-fusion attenuation/phase lag. Static gravity (0 Hz DC)
      // is cleanly stripped per axis by DC subtraction + 1.5 Hz high-pass ramp in computeFFTInMils.
      const acc =
        event.accelerationIncludingGravity?.x !== null &&
        event.accelerationIncludingGravity?.x !== undefined
          ? event.accelerationIncludingGravity
          : event.acceleration;

      const x = acc?.x ?? 0;
      const y = acc?.y ?? 0;
      const z = acc?.z ?? 0;

      this.recordSample(now, x, y, z, handleDone);
    };

    window.addEventListener('devicemotion', this.motionHandler, { passive: true });
  }

  public stopRecording() {
    this.isRecording = false;
    if (this.fallbackTimer !== null) {
      window.clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (this.finishTimer !== null) {
      window.clearTimeout(this.finishTimer);
      this.finishTimer = null;
    }
    if (this.genericSensor) {
      try {
        this.genericSensor.stop();
      } catch {
        // ignore
      }
      this.genericSensor = null;
    }
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
   * Uses the user's calibration values:
   * O: 3.75 mils, O+T1: 3.38 mils, O+T2: 3.86 mils, O+T3: 6.80 mils
   */
  private startSimulation(
    runType: 'O' | 'O+T1' | 'O+T2' | 'O+T3',
    baseRpm: number,
    onDone: () => void
  ) {
    const f1X = baseRpm / 60; // e.g. 1800 RPM = 30 Hz
    const sampleRateHz = 240;
    const dtMs = 1000 / sampleRateHz;
    let simTimeMs = 0;

    // Convert target mils pk-pk to equivalent acceleration:
    // a_pk = mils_pk_pk * (omega^2) / 78740.157
    const omega = 2 * Math.PI * f1X;
    const targetMilsMap = {
      'O': 3.75,
      'O+T1': 3.38,
      'O+T2': 3.86,
      'O+T3': 6.80,
    };

    const targetMils = targetMilsMap[runType];
    const targetAcc = (targetMils * omega * omega) / 78740.157;

    // Split across axes (mostly Z vertical + some X horizontal, plus static gravity 9.81 on Z)
    const tickMs = 16;
    this.simulatedInterval = window.setInterval(() => {
      if (!this.isRecording) return;

      const elapsedMs = Math.min(this.targetDurationMs, performance.now() - this.recordingStartMs);

      while (simTimeMs + dtMs <= elapsedMs) {
        simTimeMs += dtMs;
        const tSec = simTimeMs / 1000;
        const angle = omega * tSec;

        // 1X unbalance + subtle 2X harmonic + low noise
        const sig1X = targetAcc * Math.sin(angle);
        const sig2X = targetAcc * 0.12 * Math.sin(2 * angle + 0.5);
        const noise = (Math.random() - 0.5) * targetAcc * 0.06;

        const total = sig1X + sig2X + noise;

        // Unit vector (0.85 Z, 0.45 X, 0.2646 Y => norm = 1.0)
        const x = total * 0.45;
        const y = total * 0.2646;
        const z = 9.81 + total * 0.85; // includes 1g gravity on Z like a phone resting flat

        const sample: VibrationSample = {
          timestamp: this.recordingStartMs + simTimeMs,
          x,
          y,
          z,
          magnitude: Math.hypot(x, y, z),
        };

        this.samples.push(sample);
        this.callbacks.onSample?.(sample);
      }

      if (elapsedMs >= this.targetDurationMs) {
        onDone();
      }
    }, tickMs);
  }
}
