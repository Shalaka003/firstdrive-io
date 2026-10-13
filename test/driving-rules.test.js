import test from 'node:test';
import assert from 'node:assert/strict';
import { assessDriving, assessRailCrossing, canCreditStop, inSchoolZone } from '../src/driving-rules.js';

const check = (changes = {}) => assessDriving({
  x: 3.5, z: 70, step: 'approach', mph: 0, stopped: false, trafficX: 23,
  ...changes
});

test('the marked school zone has a 15 mph limit, while the next block has 25', () => {
  assert.equal(inSchoolZone(125.1), false);
  assert.equal(inSchoolZone(125), true);
  assert.equal(inSchoolZone(70), true);
  assert.equal(inSchoolZone(28.1), true);
  assert.equal(inSchoolZone(28), false);
  assert.equal(check({ z: 70 }).limit, 15);
  assert.equal(check({ z: 25 }).limit, 25);
});

test('school-zone speeding warns before it reaches the DMV critical threshold', () => {
  assert.equal(check({ mph: 17 }).speedWarning, true);
  assert.equal(check({ mph: 24 }).critical, null);
  assert.equal(check({ mph: 25 }).critical, 'school-speed');
});

test('crossing into oncoming lane fails on approach but a legal left turn is allowed', () => {
  assert.equal(check({ x: -0.2 }).critical, 'oncoming');
  assert.equal(check({ x: -0.2, z: 14, step: 'turn' }).critical, null);
});

test('rolling across the stop line fails, while a completed stop proceeds', () => {
  assert.equal(check({ z: 11.9, step: 'stop-drive' }).critical, 'stop');
  assert.equal(check({ z: 11.9, step: 'stop-drive', stopped: true }).critical, null);
});

test('a displayed 0 MPH on the final approach credits the stop', () => {
  assert.equal(canCreditStop({ z: 28, speed: 0, step: 'stop-drive' }), true);
  assert.equal(canCreditStop({ z: 13, speed: 0.18, step: 'stop-drive' }), true);
  assert.equal(canCreditStop({ z: 28, speed: 0.3, step: 'stop-drive' }), false);
  assert.equal(canCreditStop({ z: 11.9, speed: 0, step: 'stop-drive' }), false);
});

test('entering with crossing traffic fails', () => {
  assert.equal(check({ x: 2, z: 2, step: 'turn', trafficX: 4 }).critical, 'traffic');
});

test('crossing while red lights flash fails; crossing after they stop is allowed', () => {
  const crossing = { x: -38, railPhase: 'active', speed: 2, trackStopTimer: 0 };
  assert.equal(assessRailCrossing(crossing), 'rail-active');
  assert.equal(assessRailCrossing({ ...crossing, railPhase: 'clear' }), null);
});

test('stopping on the rails ends the run', () => {
  assert.equal(assessRailCrossing({ x: -46, railPhase: 'clear', speed: 0, trackStopTimer: 1.1 }), 'rail-tracks');
});
