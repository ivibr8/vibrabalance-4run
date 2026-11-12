import { BalancingCalculationResult, BalancingConfig, PolarIntersectionPoint, RunData } from '../types/balancing';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function normalizeAngle(deg: number): number {
  let angle = deg % 360;
  if (angle < 0) angle += 360;
  return angle;
}

/**
 * Computes the 4-Run No-Phase Balancing Solution and the Polar Plot Circle Intersections.
 * Construction:
 * 1. Polar circle of radius O centered at (0, 0).
 * 2. Three trial weights located on the "O" circle at phase angles theta_1, theta_2, theta_3:
 *    P_k = (O * cos(theta_k), O * sin(theta_k))
 * 3. Three circles centered at P_k with radius equal to measured magnitude (O+T_k).
 * 4. Intersection point of the three circles.
 * 5. Correction weight vector from center (0,0) to the intersection.
 */
export function solveFourRunNoPhase(
  runs: RunData[],
  config: BalancingConfig
): BalancingCalculationResult {
  const runO = runs.find(r => r.type === 'O');
  const runT1 = runs.find(r => r.type === 'O+T1');
  const runT2 = runs.find(r => r.type === 'O+T2');
  const runT3 = runs.find(r => r.type === 'O+T3');

  if (!runO || !runT1 || !runT2 || !runT3) {
    return createEmptyResult('Missing run data');
  }

  const O = Math.max(0, runO.amplitudeMils);
  const OT1 = Math.max(0, runT1.amplitudeMils);
  const OT2 = Math.max(0, runT2.amplitudeMils);
  const OT3 = Math.max(0, runT3.amplitudeMils);

  if (O <= 0) {
    return createEmptyResult('Baseline "O" vibration must be greater than 0 mils.');
  }

  if (config.trialMass <= 0) {
    return createEmptyResult('Trial mass must be greater than 0.');
  }

  const theta1 = runT1.phaseAngleDeg;
  const theta2 = runT2.phaseAngleDeg;
  const theta3 = runT3.phaseAngleDeg;

  // Locations of trial weights on the "O" circle
  const p1x = O * Math.cos(theta1 * DEG2RAD);
  const p1y = O * Math.sin(theta1 * DEG2RAD);

  const p2x = O * Math.cos(theta2 * DEG2RAD);
  const p2y = O * Math.sin(theta2 * DEG2RAD);

  const p3x = O * Math.cos(theta3 * DEG2RAD);
  const p3y = O * Math.sin(theta3 * DEG2RAD);

  // Check if standard 120-degree spacing (e.g. 0°, 120°, 240°)
  const dTheta2 = normalizeAngle(theta2 - theta1);
  const dTheta3 = normalizeAngle(theta3 - theta1);
  const is120 = Math.abs(dTheta2 - 120) < 1.5 && Math.abs(dTheta3 - 240) < 1.5;

  let trialEffectT = 0;
  let interX = 0;
  let interY = 0;
  let interAngleDeg = 0;

  if (is120) {
    // Exact analytical 120° formula for 4-run balancing:
    // T^2 = (OT1^2 + OT2^2 + OT3^2 - 3*O^2) / 3
    const tSquared = (OT1 * OT1 + OT2 * OT2 + OT3 * OT3 - 3 * O * O) / 3;
    trialEffectT = tSquared > 0 ? Math.sqrt(tSquared) : O * 0.5;

    // Direction of the intersection from radical lines
    // 2*(p2x - p1x)*x + 2*(p2y - p1y)*y = OT1^2 - OT2^2
    // 2*(p3x - p1x)*x + 2*(p3y - p1y)*y = OT1^2 - OT3^2
    const a1 = 2 * (p2x - p1x);
    const b1 = 2 * (p2y - p1y);
    const c1 = (OT1 * OT1 - OT2 * OT2);

    const a2 = 2 * (p3x - p1x);
    const b2 = 2 * (p3y - p1y);
    const c2 = (OT1 * OT1 - OT3 * OT3);

    const det = a1 * b2 - a2 * b1;
    if (Math.abs(det) > 1e-5) {
      const rx = (c1 * b2 - c2 * b1) / det;
      const ry = (a1 * c2 - a2 * c1) / det;
      interAngleDeg = normalizeAngle(Math.atan2(ry, rx) * RAD2DEG);
    } else {
      interAngleDeg = 0;
    }

    // Place the intersection at distance T along the radical ray
    interX = trialEffectT * Math.cos(interAngleDeg * DEG2RAD);
    interY = trialEffectT * Math.sin(interAngleDeg * DEG2RAD);
  } else {
    // Generalized arbitrary angles solver
    const a1 = 2 * (p2x - p1x);
    const b1 = 2 * (p2y - p1y);
    const c1 = (OT1 * OT1 - OT2 * OT2);

    const a2 = 2 * (p3x - p1x);
    const b2 = 2 * (p3y - p1y);
    const c2 = (OT1 * OT1 - OT3 * OT3);

    const det = a1 * b2 - a2 * b1;
    if (Math.abs(det) > 1e-5) {
      interX = (c1 * b2 - c2 * b1) / det;
      interY = (a1 * c2 - a2 * c1) / det;
      trialEffectT = Math.hypot(interX, interY);
      interAngleDeg = normalizeAngle(Math.atan2(interY, interX) * RAD2DEG);
    } else {
      trialEffectT = O * 0.5;
      interAngleDeg = 0;
      interX = trialEffectT;
      interY = 0;
    }
  }

  if (trialEffectT < 0.001) trialEffectT = 0.001;

  // Calibration sensitivity factor (mils per oz or gram)
  const calibrationFactor = trialEffectT / config.trialMass;

  // Required Correction Weight:
  // W_C = W_T * (O / T)
  const correctionWeight = config.trialMass * (O / trialEffectT);
  const correctionAngleDeg = normalizeAngle(interAngleDeg);

  // Trim Weight Option (if trial weight is left on rotor at theta1):
  // W_trim = W_C - W_T
  const wcX = correctionWeight * Math.cos(correctionAngleDeg * DEG2RAD);
  const wcY = correctionWeight * Math.sin(correctionAngleDeg * DEG2RAD);
  const wtX = config.trialMass * Math.cos(theta1 * DEG2RAD);
  const wtY = config.trialMass * Math.sin(theta1 * DEG2RAD);

  const trimX = wcX - wtX;
  const trimY = wcY - wtY;
  const trimWeight = Math.hypot(trimX, trimY);
  const trimAngleDeg = normalizeAngle(Math.atan2(trimY, trimX) * RAD2DEG);

  return {
    isValid: true,
    o: Math.round(O * 100) / 100,
    ot1: Math.round(OT1 * 100) / 100,
    ot2: Math.round(OT2 * 100) / 100,
    ot3: Math.round(OT3 * 100) / 100,
    t1Angle: theta1,
    t2Angle: theta2,
    t3Angle: theta3,
    trialEffectT: Math.round(trialEffectT * 1000) / 1000,
    calibrationFactor: Math.round(calibrationFactor * 1000) / 1000,
    intersection: {
      x: Math.round(interX * 100) / 100,
      y: Math.round(interY * 100) / 100,
      distance: Math.round(trialEffectT * 100) / 100,
      angleDeg: Math.round(interAngleDeg * 10) / 10,
    },
    correctionWeight: Math.round(correctionWeight * 100) / 100,
    correctionAngleDeg: Math.round(correctionAngleDeg * 10) / 10,
    trimWeight: Math.round(trimWeight * 100) / 100,
    trimAngleDeg: Math.round(trimAngleDeg * 10) / 10,
    oCircleRadius: O,
    t1Location: { x: p1x, y: p1y, r: OT1 },
    t2Location: { x: p2x, y: p2y, r: OT2 },
    t3Location: { x: p3x, y: p3y, r: OT3 },
  };
}

function createEmptyResult(errorMsg: string): BalancingCalculationResult {
  return {
    isValid: false,
    errorMessage: errorMsg,
    o: 0,
    ot1: 0,
    ot2: 0,
    ot3: 0,
    t1Angle: 0,
    t2Angle: 120,
    t3Angle: 240,
    trialEffectT: 0,
    calibrationFactor: 0,
    intersection: { x: 0, y: 0, distance: 0, angleDeg: 0 },
    correctionWeight: 0,
    correctionAngleDeg: 0,
    oCircleRadius: 0,
    t1Location: { x: 0, y: 0, r: 0 },
    t2Location: { x: 0, y: 0, r: 0 },
    t3Location: { x: 0, y: 0, r: 0 },
  };
}
