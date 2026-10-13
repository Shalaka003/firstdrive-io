import test from 'node:test';
import assert from 'node:assert/strict';
import { shuffledOptionIndices } from '../src/question-options.js';

test('shuffled display contains every original answer exactly once', () => {
  const order = shuffledOptionIndices(4, [], () => 0);
  assert.deepEqual([...order].sort(), [0, 1, 2, 3]);
  assert.equal(order.length, 4);
  // The correct answer is still identified by its original index after display shuffling.
  const correctOriginalIndex = 2;
  assert.equal(order[order.indexOf(correctOriginalIndex)], correctOriginalIndex);
});

test('reopening a question avoids repeating its previous option order', () => {
  const previous = shuffledOptionIndices(4, [], () => 0);
  const next = shuffledOptionIndices(4, previous, () => 0);
  assert.notDeepEqual(next, previous);
  assert.deepEqual([...next].sort(), [0, 1, 2, 3]);
});
