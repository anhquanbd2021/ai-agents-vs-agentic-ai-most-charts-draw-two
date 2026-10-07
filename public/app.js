import { RUNGS, runBatch, coordinateCheckout, DEFAULT_FENCE_USD } from '/lab.mjs';

function byId(id) {
  return document.getElementById(id);
}

const ORDERS = [
  { id: 'ord-1001', amountUsd: 25 },
  { id: 'ord-1002', amountUsd: 480 },
  { id: 'ord-1003', amountUsd: 12 },
  { id: 'ord-1004', amountUsd: 999 },
];

function currentConfig() {
  const rungId = document.querySelector('input[name="rung"]:checked').value;
 const brokenFence = byId('broken-fence').checked;
 return { rungId, fenceUsd: DEFAULT_FENCE_USD, brokenFence };
}

function renderRungs(activeId) {
 const list = byId('rung-list');
 list.innerHTML = '';
 for (const run of RUNGS) {
 const li = document.createElement('li');
 li.className = run.id === activeId ? 'rung active' : 'rung';
 const strong = document.createElement('strong');
 strong.textContent = run.id;
 const span = document.createElement('span');
 span.textContent = run.name;
 const em = document.createElement('em');
 em.textContent = run.claim;
 li.append(strong, span, em);
 list.appendChild(li);
 }
}

function renderDecisions(decisions) {
 const list = byId('decision-list');
 list.innerHTML = '';
 for (const decision of decisions) {
 const li = document.createElement('li');
 const label = decision.type === 'agent' ? 'executed alone' : decision.type === 'handoff' ? 'asked a human' : 'human step';
 li.className = decision.type;
 const strong = document.createElement('strong');
 strong.textContent = decision.order.id;
 const span = document.createElement('span');
 span.textContent = decision.order.amountUsd + ' USD';
 const em = document.createElement('em');
 em.textContent = label;
 li.append(strong, span, em);
 list.appendChild(li);
 }
}

function paint(result) {
 renderRungs(result.rung.id);
 renderDecisions(result.decisions);
 byId('executed-count').textContent = String(result.executedCount);
 byId('handoff-count').textContent = String(result.handoffCount);
 byId('total-usd').textContent = '$' + result.totalExecutedUsd;
 const badge = byId('status-badge');
 badge.textContent = result.status;
 badge.className = result.status === 'runaway' ? 'badge fail' : 'badge pass';
 const coord = result.coordination;
 const note = coord.subAgents.length
 ? 'coordinator: ' + coord.coordinator + ' -> ' + coord.subAgents.join(', ')
 : 'no sub-agents at ' + coord.rung.id;
 byId('ladder-title').textContent = note;
}

function runBatchLocal() {
 const config = currentConfig();
 const result = runBatch(ORDERS, config);
 paint({ ...result, coordination: coordinateCheckout(config) });
}

for (const input of document.querySelectorAll('input[name="rung"], #broken-fence')) {
 input.addEventListener('change', runBatchLocal);
}

byId('run-batch').addEventListener('click', runBatchLocal);
runBatchLocal();

