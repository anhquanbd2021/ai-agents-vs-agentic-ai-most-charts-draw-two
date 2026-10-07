import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createStaticServer } from '../app/server.js';

async function withServer(fn) {
  const server = createStaticServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    await fn(base);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('lab page, guide page, health, and version respond', async () => {
  await withServer(async base => {
    const home = await fetch(base + '/');
    assert.equal(home.status, 200);
    const html = await home.text();
    assert.match(html, /<nav aria-label="Primary">/);
    assert.match(html, /Ladder Lab/);

    const guide = await fetch(base + '/guide.html');
    assert.equal(guide.status, 200);
    assert.match(await guide.text(), /Guide — Ladder Lab/);

    const health = await fetch(base + '/health');
    assert.equal(health.status, 200);
    assert.equal(await health.text(), 'ok');

    const version = await fetch(base + '/version');
    assert.equal(version.status, 200);
    const data = await version.json();
    assert.equal(data.name, 'ai-agents-vs-agentic-ai-most-charts-draw-two-demo');
    assert.equal(data.version, '1.0.0');
  });
});

test('the API runs the seeded batch and reports the failure', async () => {
  await withServer(async base => {
    const response = await fetch(base + '/api/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        rungId: 'L2',
        fenceUsd: 50,
        brokenFence: true,
        orders: [
          { id: 'ord-1', amountUsd: 25 },
          { id: 'ord-2', amountUsd: 480 },
        ],
      }),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.status, 'runaway');
    assert.equal(result.executedCount, 2);
    assert.equal(result.totalExecutedUsd, 505);
    assert.deepEqual(result.coordination.subAgents, []);
  });
});

test('static assets and unknown paths behave', async () => {
  await withServer(async base => {
    for (const path of ['/styles.css', '/app.js', '/lab.mjs', '/pb-shell.css', '/pb-back.css']) {
      const res = await fetch(base + path);
      assert.equal(res.status, 200, path);
    }
    assert.equal((await fetch(base + '/nope')).status, 404);
    const head = await fetch(base + '/', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  });
});

