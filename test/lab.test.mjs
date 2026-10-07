import test from 'node:test';
import assert from 'node:assert/strict';
import { RUNGS, rung, decideRefund, runBatch, coordinateCheckout, DEFAULT_FENCE_USD } from '../public/lab.mjs';

test('the ladder has four named rungs', () => {
  assert.deepEqual(RUNGS.map(r => r.id), ['L0', 'L1', 'L2', 'L3']);
  assert.equal(DEFAULT_FENCE_USD, 50);
});

test('L0 and L1 always require a human step', () => {
  const order = { id: 'ord-1', amountUsd: 10 };
  assert.equal(decideRefund(order, { rungId: 'L0' }).type, 'human');
  assert.equal(decideRefund(order, { rungId: 'L1' }).type, 'human');
});

test('L2 executes inside the fence and asks above it', () => {
  const small = { id: 'ord-2', amountUsd: 25 };
  const large = { id: 'ord-3', amountUsd: 480 };
  assert.equal(decideRefund(small, { rungId: 'L2' }).type, 'agent');
  assert.equal(decideRefund(large, { rungId: 'L2' }).type, 'handoff');
});

test('L3 coordinates sub-agents and still respects the fence', () => {
  const small = { id: 'ord-4', amountUsd: 12 };
  const large = { id: 'ord-5', amountUsd: 999 };
  assert.equal(decideRefund(small, { rungId: 'L3' }).type, 'agent');
  assert.equal(decideRefund(large, { rungId: 'L3' }).type, 'handoff');
  const coord = coordinateCheckout({ rungId: 'L3' });
  assert.deepEqual(coord.subAgents, ['payments-agent', 'loyalty-agent']);
  assert.equal(coord.coordinator, 'checkout-coordinator');
});

test('the seeded failure is reproducible: broken fence runs away', () => {
  const orders = [
    { id: 'ord-6', amountUsd: 25 },
    { id: 'ord-7', amountUsd: 480 },
    { id: 'ord-8', amountUsd: 12 },
    { id: 'ord-9', amountUsd: 999 },
  ];
  const safe = runBatch(orders, { rungId: 'L2', fenceUsd: 50, brokenFence: false });
  const broken = runBatch(orders, { rungId: 'L2', fenceUsd: 50, brokenFence: true });
  assert.equal(safe.status, 'fenced');
  assert.equal(safe.executedCount, 2);
  assert.equal(safe.handoffCount, 2);
  assert.equal(safe.totalExecutedUsd, 37);
  assert.equal(broken.status, 'runaway');
  assert.equal(broken.executedCount, 4);
  assert.equal(broken.totalExecutedUsd, 1516);
});

test('unknown rungs and invalid orders fail loudly', () => {
  assert.throws(() => rung('L9'), /unknown rung/);
  assert.throws(() => decideRefund({}, { rungId: 'L2' }), /amountUsd/);
});
