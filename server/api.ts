import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pool } from './db.js';
import { PostgresMutationStore } from './postgresMutationStore.js';
import type { SyncMutation } from '../src/facility/syncContract.js';
import { isWriteAuthorized } from './auth.js';

const store = new PostgresMutationStore(pool);
const port = Number(process.env.IAG_API_PORT ?? 8787);
const allowedOrigins = new Set((process.env.IAG_ALLOWED_ORIGINS ?? 'http://127.0.0.1:4173,http://localhost:4173').split(',').map((value) => value.trim()).filter(Boolean));
// Development remains usable without a token; production deployments should set this
// behind a real identity provider before exposing the API beyond loopback.
const writeToken = process.env.IAG_WRITE_TOKEN?.trim() || null;

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function body(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > 1_000_000) throw new Error('Request body is too large.');
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function mutationShape(value: unknown): value is SyncMutation {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SyncMutation>;
  return Boolean(item.mutationId && item.entityId && item.entityType && item.actorId && item.clientId && item.createdAt)
    && Number.isInteger(item.baseVersion) && (item.baseVersion ?? -1) >= 0
    && (item.operation === 'UPSERT' || item.operation === 'DELETE');
}

const server = createServer(async (request, response) => {
  try {
    const origin = request.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      response.setHeader('access-control-allow-origin', origin);
      response.setHeader('vary', 'Origin');
      response.setHeader('access-control-allow-headers', 'content-type, authorization');
      response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
    }
    if (request.method === 'OPTIONS') { response.writeHead(origin && allowedOrigins.has(origin) ? 204 : 403); return response.end(); }
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (request.method === 'GET' && url.pathname === '/health') {
      await pool.query('SELECT 1');
      return json(response, 200, { status: 'ok' });
    }
    const entityMatch = /^\/api\/facilities\/([^/]+)\/entities\/([^/]+)$/.exec(url.pathname);
    if (request.method === 'GET' && entityMatch) {
      const entity = await store.entity(decodeURIComponent(entityMatch[1]), decodeURIComponent(entityMatch[2]));
      return json(response, entity ? 200 : 404, entity ?? { error: 'Entity not found.' });
    }
    const entitiesMatch = /^\/api\/facilities\/([^/]+)\/entities$/.exec(url.pathname);
    if (request.method === 'GET' && entitiesMatch) {
      const entities = await store.entities(decodeURIComponent(entitiesMatch[1]), url.searchParams.get('since') ?? undefined);
      return json(response, 200, { entities });
    }
    const mutationMatch = /^\/api\/facilities\/([^/]+)\/mutations$/.exec(url.pathname);
    if (request.method === 'POST' && mutationMatch) {
      if (!isWriteAuthorized(request.headers, writeToken)) return json(response, 401, { error: 'Authentication required for shared writes.' });
      const input = await body(request);
      if (!mutationShape(input)) return json(response, 400, { error: 'Invalid mutation.' });
      const result = await store.apply(decodeURIComponent(mutationMatch[1]), input);
      return json(response, result.status === 'conflict' ? 409 : 200, result);
    }
    return json(response, 404, { error: 'Not found.' });
  } catch (error) {
    const message = error instanceof Error && /eligible|required|too large/i.test(error.message) ? error.message : 'The request could not be completed.';
    return json(response, /eligible|required|too large/i.test(message) ? 400 : 500, { error: message });
  }
});

server.listen(port, '127.0.0.1', () => process.stdout.write(`Industrial Asset Graph API listening on http://127.0.0.1:${port}\n`));

async function shutdown() {
  server.close();
  await pool.end();
}
process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
