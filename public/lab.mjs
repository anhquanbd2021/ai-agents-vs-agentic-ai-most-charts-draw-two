export const RUNGS = [
  { id: 'L0', name: 'Prompt', claim: 'You choose every step', decidedAlone: 0 },
  { id: 'L1', name: 'Assisted', claim: 'It plans, you approve', decidedAlone: 0 },
  { id: 'L2', name: 'Agent', claim: 'It acts in a fenced scope', decidedAlone: 1 },
  { id: 'L3', name: 'Agentic', claim: 'It coordinates other agents', decidedAlone: 2 },
];

export const DEFAULT_FENCE_USD = 50;

export function rung(id) {
  const found = RUNGS.find(run => run.id === id);
  if (!found) throw new Error(`unknown rung: ${id}`);
  return found;
}

function approveRefund(order, reason) {
  return { type: 'human', order, reason };
}

function executeRefund(order, reason) {
  return { type: 'agent', order, reason, amountUsd: order.amountUsd };
}

function askForApproval(order, reason) {
  return { type: 'handoff', order, reason, amountUsd: order.amountUsd };
}

export function decideRefund(order, { rungId, fenceUsd = DEFAULT_FENCE_USD, brokenFence = false } = {}) {
  if (!order || typeof order.amountUsd !== 'number' || Number.isNaN(order.amountUsd)) {
    throw new Error('order.amountUsd must be a number');
  }
  const selected = rung(rungId);
  const effectiveFenceUsd = brokenFence ? Number.POSITIVE_INFINITY : fenceUsd;

  if (selected.id === 'L0') return approveRefund(order, 'L0: operator chooses every step');
  if (selected.id === 'L1') return approveRefund(order, 'L1: operator approves the plan');

  if (order.amountUsd <= effectiveFenceUsd) {
    return executeRefund(order, `${selected.id}: within fence`);
  }
  return askForApproval(order, `${selected.id}: above fence`);
}

export function runBatch(orders, config = {}) {
  const decisions = orders.map(order => decideRefund(order, config));
  const executed = decisions.filter(decision => decision.type === 'agent');
  const handoffs = decisions.filter(decision => decision.type === 'handoff');
  const humanSteps = decisions.filter(decision => decision.type === 'human');
  return {
    rung: rung(config.rungId),
    decisions,
    executedCount: executed.length,
    handoffCount: handoffs.length,
    humanStepCount: humanSteps.length,
    totalExecutedUsd: executed.reduce((sum, decision) => sum + decision.amountUsd, 0),
    status: config.brokenFence && executed.some(decision => decision.amountUsd > (config.fenceUsd ?? DEFAULT_FENCE_USD))
      ? 'runaway'
      : 'fenced',
  };
}

export function coordinateCheckout(config = {}) {
  const selected = rung(config.rungId);
  const subAgents = selected.id === 'L3'
    ? ['payments-agent', 'loyalty-agent']
    : [];
  return {
    rung: selected,
    coordinator: selected.id === 'L3' ? 'checkout-coordinator' : null,
    subAgents,
    toolCalls: subAgents.map(agent => `${agent}.refund()`),
  };
}
