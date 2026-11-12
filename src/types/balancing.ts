export interface VibrationSample {
  timestamp: number; // millisecond timestamp
  x: number; // m/s^2
  y: number;
  z: number;
  magnitude: number;
}

export interface SpectrumPeak {
  frequencyHz: number;
  frequencyRpm: number;
  amplitudeMils: number;
  isHarmonic?: boolean;
  harmonicOrder?: number;
}

export interface FFTResult {
  frequenciesHz: number[];
  frequenciesRpm: number[];
  amplitudesMils: number[];
  sampleRate: number;
  durationSec: number;
  resolutionHz: number;
  peaks: SpectrumPeak[];
  dominantPeak: SpectrumPeak | null;
  overallMils: number;
  maxMils: number;
}

export type RunType = 'O' | 'O+T1' | 'O+T2' | 'O+T3';

export interface RunData {
  type: RunType;
  title: string;
  subtitle: string;
  phaseAngleDeg: number; // phase location (0 for O, user defined for T1, T2, T3)
  amplitudeMils: number; // measured magnitude in mils
  frequencyHz: number; // identified running speed frequency
  runningRpm: number;
  isKept: boolean; // whether user clicked "Keep This Measurement"
  measuredAt?: string;
  notes?: string;
}

export interface BalancingConfig {
  trialMass: number; // mass value
  massUnit: 'g' | 'oz';
  nominalRpm: number;
  rotationDirection: 'CW' | 'CCW';
  t1AngleDeg: number;
  t2AngleDeg: number;
  t3AngleDeg: number;
}

export interface PolarIntersectionPoint {
  x: number;
  y: number;
  distance: number;
  angleDeg: number;
}

export interface BalancingCalculationResult {
  isValid: boolean;
  errorMessage?: string;
  o: number; // mils
  ot1: number; // mils
  ot2: number; // mils
  ot3: number; // mils
  t1Angle: number;
  t2Angle: number;
  t3Angle: number;
  trialEffectT: number; // mils
  calibrationFactor: number; // mils per gram/oz
  // Intersection point of the three runs
  intersection: PolarIntersectionPoint;
  // Correction weight
  correctionWeight: number;
  correctionAngleDeg: number;
  // Trim weight if trial weight is left on
  trimWeight?: number;
  trimAngleDeg?: number;
  // Circle geometry for Polar Plot
  oCircleRadius: number; // O
  t1Location: { x: number; y: number; r: number };
  t2Location: { x: number; y: number; r: number };
  t3Location: { x: number; y: number; r: number };
}
