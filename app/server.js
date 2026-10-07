import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runBatch, coordinateCheckout, DEFAULT_FENCE_USD } from '../public/lab.mjs';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const PACKAGE = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const STATIC_FILES = new Map([
  ['/', ['text/html; charset=utf-8', 'index.html']],
  ['/guide.html', ['text/html; charset=utf-8', 'guide.html']],
  ['/styles.css', ['text/css; charset=utf-8', 'styles.css']],
  ['/app.js', ['text/javascript; charset=utf-8', 'app.js']],
  ['/lab.mjs', ['text/javascript; charset=utf-8', 'lab.mjs']],
  ['/pb-shell.css', ['text/css; charset=utf-8', 'pb-shell.css']],
  ['/pb-back.css', ['text/css; charset=utf-8', 'pb-back.css']],
].map(([path, [type, file]]) => [path, [type, readFileSync(join(PUBLIC, file))]]));
const SECURITY_HEADERS = {
  'content-security-policy': "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'permissions-policy': 'camera=(), geolocation=(), microphone=()',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
};

function sendJson(res, status, value) {
  res.writeHead(status, { ...SECURITY_HEADERS, 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify(value));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export function createStaticServer() {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/health') {
      res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': 'text/plain; charset=utf-8' }).end('ok');
      return;
    }
    if (url.pathname === '/version') {
      res.writeHead(200, { ...SECURITY_HEADERS, 'content-type': 'application/json; charset=utf-8' })
        .end(JSON.stringify({
          name: PACKAGE.name,
          version: PACKAGE.version,
          commit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || 'local',
        }));
      return;
    }
    if (url.pathname === '/api/ladder' && req.method === 'GET') {
      sendJson(res, 200, { defaultFenceUsd: DEFAULT_FENCE_USD, rungs: ['L0', 'L1', 'L2', 'L3'] });
      return;
    }
    if (url.pathname === '/api/run' && req.method === 'POST') {
      try {
        const payload = JSON.parse(await readBody(req));
        const orders = Array.isArray(payload.orders) ? payload.orders : [];
        const result = runBatch(orders, {
          rungId: payload.rungId,
          fenceUsd: payload.fenceUsd,
          brokenFence: Boolean(payload.brokenFence),
        });
        sendJson(res, 200, { ...result, coordination: coordinateCheckout({ rungId: payload.rungId }) });
        return;
      } catch (error) {
        sendJson(res, 400, { error: error.message });
        return;
      }
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      const asset = STATIC_FILES.get(url.pathname);
      if (asset) {
        res.writeHead(200, {
          ...SECURITY_HEADERS,
          'cache-control': 'public, max-age=300',
          'content-type': asset[0],
        }).end(req.method === 'HEAD' ? undefined : asset[1]);
        return;
      }
    }
    res.writeHead(404, SECURITY_HEADERS).end('not found');
  });
}

export async function startProduction({ port = Number(process.env.PORT) || 3000 } = {}) {
  const server = createStaticServer();
  server.listen(port, '0.0.0.0');
  await once(server, 'listening');
  const close = () => new Promise(resolve => server.close(resolve));
  return { server, close };
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  const { server, close } = await startProduction();
  console.log("Ladder Lab listening on " + server.address().port);
  const shutdown = async () => { await close(); process.exit(0); };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}




