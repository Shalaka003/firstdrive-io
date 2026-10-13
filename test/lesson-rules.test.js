import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_X, FREEWAY_X } from '../src/lesson-worlds.js';
import { advanceTrafficScan, assessNextLesson, laneCheck, lessonLimit, turnCheck } from '../src/lesson-rules.js';

test('the freeway exit advisory does not suddenly become a 35 mph speed limit', () => {
  assert.equal(lessonLimit(2, CITY_X + 6, 80), 25);
  assert.equal(lessonLimit(3, FREEWAY_X + 16, 150), 35);
  assert.equal(lessonLimit(3, FREEWAY_X + 8, 20), 65);
  assert.equal(lessonLimit(3, FREEWAY_X + 16, -124.9), 65);
  assert.equal(lessonLimit(3, FREEWAY_X + 16, -125), 65);
  assert.equal(lessonLimit(3, FREEWAY_X + 19, -260), 65);
  assert.equal(assessNextLesson({ lesson:3,x:FREEWAY_X+19,z:-260,step:'freeway-ramp',mph:55 }).critical,null);
});

test('lane check needs a signal, relevant mirror, and distinct shoulder check', () => {
  const seen = new Set(['right']);
  assert.deepEqual(laneCheck({ signal:'right',seen,side:'right' }), ['right shoulder check']);
  seen.add('right-shoulder');
  assert.deepEqual(laneCheck({ signal:'right',seen,side:'right' }), []);
  assert.deepEqual(laneCheck({ signal:'off',seen,side:'left' }), ['left signal','left mirror','left shoulder check']);
});

test('freeway merge warns about traffic speed while city lane change does not', () => {
  const seen = new Set(['left','left-shoulder']);
  assert.deepEqual(laneCheck({ signal:'left',seen,side:'left',mph:20,freeway:true }), ['speed matched to traffic']);
  assert.deepEqual(laneCheck({ signal:'left',seen,side:'left',mph:20,freeway:false }), []);
});

test('a right turn accepts one cross-traffic look in each direction', () => {
  const seen = new Set(['right', 'right-shoulder']);
  let trafficScan = [];
  assert.deepEqual(turnCheck({ signal:'right', seen, side:'right', trafficScan, scanTraffic:true }), ['look left and right for cross traffic']);
  for (const side of ['right','left']) trafficScan = advanceTrafficScan(trafficScan, side);
  assert.deepEqual(turnCheck({ signal:'right', seen, side:'right', trafficScan, scanTraffic:true }), []);
  assert.deepEqual(trafficScan, ['right','left']);
  seen.delete('right-shoulder');
  assert.deepEqual(turnCheck({ signal:'right', seen, side:'right', trafficScan, scanTraffic:true }), ['right shoulder check']);
  assert.deepEqual(turnCheck({ signal:'left', seen:new Set(['left', 'left-shoulder']), side:'left' }), []);
});

test('a U-turn before the requested intersection and a freeway barrier crossing end the lesson', () => {
  assert.equal(assessNextLesson({ lesson:2,x:CITY_X+2,z:11,step:'urban-right',mph:12 }).critical,'wrong-turn-lane');
  assert.equal(assessNextLesson({ lesson:2,x:CITY_X+70,z:-3,step:'urban-uturn',mph:12 }).critical,'early-uturn');
  assert.equal(assessNextLesson({ lesson:2,x:CITY_X+62,z:-3,step:'urban-cruise',mph:12 }).critical,'early-uturn');
  assert.equal(assessNextLesson({ lesson:2,x:CITY_X+118,z:-3,step:'urban-uturn',mph:12 }).critical,null);
  assert.equal(assessNextLesson({ lesson:3,x:FREEWAY_X-2,z:10,step:'freeway-cruise',mph:45 }).critical,'barrier');
});
