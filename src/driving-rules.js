// This route posts 15 mph beside its fictional school and 25 mph elsewhere.
// The DMV DPE scores 10+ mph above a posted limit as a critical error.
export function inSchoolZone(z) {
  // The posted 15 sign is at z=125 and the restoring 25 sign is at z=28.
  // Travel runs toward decreasing z, so the HUD and assessment must change
  // as the driver reaches each sign, not several meters afterward.
  return z <= 125 && z > 28;
}

export function canCreditStop({ z, speed, step }) {
  return step === 'stop-drive' && z >= 12 && z <= 38 && Math.round(speed * 2.23694) === 0;
}

export function assessDriving({ x, z, step, mph, stopped, trafficX }) {
  const limit = inSchoolZone(z) ? 15 : 25;
  if (step !== 'turn' && z > 13.3 && x < 0) {
    return { critical: 'oncoming', limit };
  }
  if (step === 'stop-drive' && z < 12 && !stopped) {
    return { critical: 'stop', limit };
  }
  if (mph >= limit + 10) {
    return { critical: inSchoolZone(z) ? 'school-speed' : 'speed', limit };
  }
  if (step === 'turn' && Math.abs(x) < 9 && Math.abs(z) < 9 && Math.abs(trafficX) < 9) {
    return { critical: 'traffic', limit };
  }
  return { critical: null, limit, speedWarning: mph > limit + 0.25 };
}

export function assessRailCrossing({ x, railPhase, speed, trackStopTimer }) {
  if (x < -36.5 && railPhase === 'active') return 'rail-active';
  if (x < -43 && x > -49 && speed < 0.2 && trackStopTimer > 1) return 'rail-tracks';
  return null;
}
