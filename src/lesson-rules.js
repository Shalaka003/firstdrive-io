import { CITY_X, FREEWAY_X } from './lesson-worlds.js';

export function lessonLimit(lesson, x, z) {
  // The exit's 35 mph plaque is advisory, not a new freeway speed limit.
  if (lesson === 3) return x > FREEWAY_X + 12 && z > 80 ? 35 : 65;
  return 25;
}

export function assessNextLesson({ lesson, x, z, step, mph }) {
  const limit = lessonLimit(lesson, x, z);
  if (mph >= limit + 10) return { critical: 'speed', limit };
  if (lesson === 2) {
    const cx = x - CITY_X;
    if (z > 15 && cx < -.7) return { critical: 'oncoming', limit };
    if (z > 15 && cx > 10.8) return { critical: 'off-road', limit };
    if (step === 'urban-right' && z < 12 && cx < 4.8) return { critical: 'wrong-turn-lane', limit };
    if ((step === 'urban-cruise' || step === 'urban-uturn') && cx > 45 && cx < 106 && z < -1.5) return { critical: 'early-uturn', limit };
    if (cx > 20 && cx < 190 && Math.abs(z) > 10.8 && !(cx > 105 && cx < 132)) return { critical: 'off-road', limit };
  }
  if (lesson === 3) {
    const fx = x - FREEWAY_X;
    if (fx < -1.5) return { critical: 'barrier', limit };
    if (fx > (z < -130 ? 24.5 : 22.5)) return { critical: 'off-road', limit };
  }
  return { critical: null, limit, speedWarning: mph > limit + .25 };
}

export function laneCheck({ signal, seen, side, mph = 0, freeway = false }) {
  const missing = [];
  if (signal !== side) missing.push(`${side} signal`);
  if (!seen.has(side)) missing.push(`${side} mirror`);
  if (!seen.has(`${side}-shoulder`)) missing.push(`${side} shoulder check`);
  if (freeway && mph < 30) missing.push('speed matched to traffic');
  return missing;
}

export function advanceTrafficScan(previous, side) {
  return [...new Set([...previous, side])];
}

export function turnCheck({ signal, seen, side, trafficScan = [], scanTraffic = false }) {
  const missing = laneCheck({ signal, seen, side });
  if (scanTraffic && (!trafficScan.includes('left') || !trafficScan.includes('right'))) missing.push('look left and right for cross traffic');
  return missing;
}
