import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceIntro } from '../src/intro-timing.js';

test('the first direction waits for five seconds of moving, excluding idle time', () => {
  let intro = advanceIntro(0, 0, 10);
  assert.deepEqual(intro, { elapsed: 0, ready: false });
  intro = advanceIntro(intro.elapsed, 5, 4.9);
  assert.equal(intro.ready, false);
  intro = advanceIntro(intro.elapsed, 0, 2);
  assert.equal(intro.ready, false);
  intro = advanceIntro(intro.elapsed, 5, 0.1);
  assert.equal(intro.ready, true);
});
