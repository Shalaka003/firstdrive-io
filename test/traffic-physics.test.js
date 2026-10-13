import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTrafficZ, overlapsPlayer } from '../src/traffic-physics.js';

test('a car behind the player follows instead of passing through', () => {
  const player = { x: 3.5, z: 100 };
  const rearCar = { x: 3.4, z: 109, speed: -10 };
  assert.equal(nextTrafficZ(rearCar, 1, player), 108);
  assert.equal(overlapsPlayer({ ...rearCar, z: 108 }, player), false);
});

test('a car in the opposing lane continues without braking for the player', () => {
  assert.equal(nextTrafficZ({ x: -3.5, z: 109, speed: -10 }, 1, { x: 3.5, z: 100 }), 99);
});

test('overlap catches a player driving into a parked or slower car', () => {
  const player = { x: 5, z: 82 };
  assert.equal(overlapsPlayer({ x: 7, z: 82 }, player), true);
  assert.equal(overlapsPlayer({ x: 7, z: 90 }, player), false);
});
