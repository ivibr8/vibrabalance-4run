import { FFTResult, SpectrumPeak, VibrationSample } from '../types/balancing';

/**
 * Resamples irregular mobile sensor timestamps into a strictly uniform time grid.
 */
export function resampleUniform(
  samples: VibrationSample[],
  targetSampleRateHz: number
): { uniformValues: Float64Array; actualDurationSec: number } {
  if (samples.length < 4) {
    return { uniformValues: new Float64Array(0), actualDurationSec: 0 };
  }

  const startTime = samples[0].timestamp;
  const endTime = samples[samples.length - 1].timestamp;
  const actualDurationSec = (endTime - startTime) / 1000;

  if (actualDurationSec <= 0) {
    return { uniformValues: new Float64Array(0), actualDurationSec: 0 };
  }

  const numUniformSamples = Math.floor(actualDurationSec * targetSampleRateHz);
  const uniformValues = new Float64Array(numUniformSamples);
  const dt = 1000 / targetSampleRateHz;

  let sampleIdx = 0;
  for (let i = 0; i < numUniformSamples; i++) {
    const targetTime = startTime + i * dt;

    while (sampleIdx < samples.length - 1 && samples[sampleIdx + 1].timestamp <= targetTime) {
      sampleIdx++;
    }

    if (sampleIdx >= samples.length - 1) {
      uniformValues[i] = samples[samples.length - 1].magnitude;
    } else {
      const s0 = samples[sampleIdx];
      const s1 = samples[sampleIdx + 1];
      const t0 = s0.timestamp;
      const t1 = s1.timestamp;
      const factor = t1 > t0 ? (targetTime - t0) / (t1 - t0) : 0;
      uniformValues[i] = s0.magnitude + factor * (s1.magnitude - s0.magnitude);
    }
  }

  return { uniformValues, actualDurationSec };
}

/**
 * Calculates next power of 2 (capped between 64 and 4096).
 */
export function nextPowerOfTwo(n: number): number {
  let p = 64;
  while (p < n && p < 4096) {
    p <<= 1;
  }
  return p;
}

/**
 * In-place Radix-2 Cooley-Tukey FFT. Length N must be a power of 2.
 */
export function fftRadix2(real: Float64Array, imag: Float64Array): void {
  const n = real.length;
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tr = real[i];
      real[i] = real[j];
      real[j] = tr;
      const ti = imag[i];
      imag[i] = imag[j];
      imag[j] = ti;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = -2 * Math.PI / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wR = 1.0;
      let wI = 0.0;
      for (let k = 0; k < halfLen; k++) {
        const pos = i + k + halfLen;
        const vR = real[pos] * wR - imag[pos] * wI;
        const vI = real[pos] * wI + imag[pos] * wR;

        real[pos] = real[i + k] - vR;
        imag[pos] = imag[i + k] - vI;
        real[i + k] += vR;
        imag[i + k] += vI;

        const nextWR = wR * wStepR - wI * wStepI;
        const nextWI = wR * wStepI + wI * wStepR;
        wR = nextWR;
        wI = nextWI;
      }
    }
  }
}

/**
 * Computes FFT and converts vibration acceleration to displacement in MILS (pk-pk).
 * 1 mil = 0.001 inches = 25.4 um.
 */
export function computeFFTInMils(
  timeData: Float64Array,
  sampleRate: number,
  userNominalRpm?: number
): FFTResult {
  const nRaw = timeData.length;
  if (nRaw < 16) {
    return {
      frequenciesHz: [],
      frequenciesRpm: [],
      amplitudesMils: [],
      sampleRate,
      durationSec: 0,
      resolutionHz: 0,
      peaks: [],
      dominantPeak: null,
      overallMils: 0,
      maxMils: 0,
    };
  }

  // Remove DC bias
  let mean = 0;
  for (let i = 0; i < nRaw; i++) mean += timeData[i];
  mean /= nRaw;

  const detrended = new Float64Array(nRaw);
  for (let i = 0; i < nRaw; i++) detrended[i] = timeData[i] - mean;

  // Windowing (Hanning window)
  const nFft = nextPowerOfTwo(nRaw);
  const real = new Float64Array(nFft);
  const imag = new Float64Array(nFft);
  const subSlice = detrended.subarray(0, Math.min(nRaw, nFft));

  let windowSum = 0;
  for (let i = 0; i < subSlice.length; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (subSlice.length - 1));
    windowSum += w;
    real[i] = subSlice[i] * w;
  }

  const amplitudeCorrection = windowSum > 0 ? subSlice.length / windowSum : 1.0;

  fftRadix2(real, imag);

  const numBins = Math.floor(nFft / 2);
  const frequenciesHz = new Array<number>(numBins);
  const frequenciesRpm = new Array<number>(numBins);
  const amplitudesMils = new Array<number>(numBins);

  const df = sampleRate / nFft;
  const normFactor = (2.0 / subSlice.length) * amplitudeCorrection;

  let sumSquares = 0;
  let maxMils = 0;

  for (let k = 0; k < numBins; k++) {
    const f = k * df;
    frequenciesHz[k] = Math.round(f * 100) / 100;
    frequenciesRpm[k] = Math.round(f * 60 * 10) / 10;

    // Peak acceleration in m/s^2
    const accPeak = Math.hypot(real[k], imag[k]) * normFactor;

    // Convert acceleration (m/s^2 peak) to displacement (mils pk-pk):
    // d_peak = a_peak / (2*pi*f)^2  (meters)
    // d_pk_pk = 2 * d_peak / 0.0000254 = a_peak / (2*pi*f)^2 * 78740.157 mils
    let mils = 0;
    if (f >= 1.5) {
      const omega = 2 * Math.PI * f;
      mils = (accPeak / (omega * omega)) * 78740.157;
    } else if (f >= 0.8) {
      // gentle ramp between 0.8 Hz and 1.5 Hz to suppress low frequency drift
      const factor = (f - 0.8) / 0.7;
      const omega = 2 * Math.PI * 1.5;
      mils = factor * (accPeak / (omega * omega)) * 78740.157;
    }

    amplitudesMils[k] = Math.max(0, Math.round(mils * 100) / 100);

    if (k > 1) {
      sumSquares += amplitudesMils[k] * amplitudesMils[k];
      if (amplitudesMils[k] > maxMils) maxMils = amplitudesMils[k];
    }
  }

  const overallMils = Math.round(Math.sqrt(sumSquares / 2) * 100) / 100;

  // Detect prominent peaks
  const peaks = detectPeaksMils(frequenciesHz, amplitudesMils, df, userNominalRpm);
  const dominantPeak = peaks.length > 0 ? peaks[0] : null;

  return {
    frequenciesHz,
    frequenciesRpm,
    amplitudesMils,
    sampleRate,
    durationSec: Math.round((nRaw / sampleRate) * 10) / 10,
    resolutionHz: Math.round(df * 100) / 100,
    peaks,
    dominantPeak,
    overallMils,
    maxMils,
  };
}

function detectPeaksMils(
  freqs: number[],
  amps: number[],
  df: number,
  userNominalRpm?: number
): SpectrumPeak[] {
  const peaks: SpectrumPeak[] = [];
  const minThreshold = Math.max(0.05, Math.max(...amps) * 0.08);

  for (let i = 2; i < amps.length - 2; i++) {
    const y0 = amps[i - 1];
    const y1 = amps[i];
    const y2 = amps[i + 1];

    if (y1 > y0 && y1 > y2 && y1 >= minThreshold) {
      const delta = (y2 - y0) / (2 * (2 * y1 - y0 - y2) + 1e-12);
      const clampedDelta = Math.max(-0.5, Math.min(0.5, delta));
      const trueFreqHz = (i + clampedDelta) * df;
      const trueAmp = y1 - 0.25 * (y0 - y2) * clampedDelta;

      peaks.push({
        frequencyHz: Math.round(trueFreqHz * 10) / 10,
        frequencyRpm: Math.round(trueFreqHz * 60),
        amplitudeMils: Math.round(Math.max(y1, trueAmp) * 100) / 100,
      });
    }
  }

  peaks.sort((a, b) => b.amplitudeMils - a.amplitudeMils);

  const base1X = userNominalRpm ? userNominalRpm / 60 : (peaks.length > 0 ? peaks[0].frequencyHz : 0);
  if (base1X > 1.0) {
    peaks.forEach(peak => {
      const ratio = peak.frequencyHz / base1X;
      if (Math.abs(ratio - 1.0) < 0.08) {
        peak.isHarmonic = true;
        peak.harmonicOrder = 1.0;
      } else if (Math.abs(ratio - 2.0) < 0.08) {
        peak.isHarmonic = true;
        peak.harmonicOrder = 2.0;
      }
    });
  }

  return peaks.slice(0, 8);
}
