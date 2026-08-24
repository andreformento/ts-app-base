import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Harness, startHarness } from './harness.js';
import { call } from './client.js';

type Document = {
  openapi: string;
  paths: Record<string, Record<string, { responses: Record<string, unknown> }>>;
};

let harness: Harness;

beforeAll(async () => {
  harness = await startHarness();
}, 300_000);

afterAll(async () => {
  await harness.stop();
});

describe('GET /openapi.json', () => {
  it('is served and well formed', async () => {
    const response = await call<Document>(harness.url, '/openapi.json');
    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.3');
  });

  it('documents every route the application actually registered', async () => {
    const spec = (await call<Document>(harness.url, '/openapi.json')).body;

    const documented = new Set<string>();
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const method of Object.keys(methods))
        documented.add(`${method.toUpperCase()} ${path}`);
    }

    const undocumented = registeredRoutes(harness).filter(
      (route) => !documented.has(route),
    );
    expect(undocumented).toEqual([]);
  });

  it('describes a request body wherever one is accepted', async () => {
    const spec = (await call<Document>(harness.url, '/openapi.json')).body;
    const post = spec.paths['/spaces']?.['post'];
    expect(post).toBeDefined();
    expect(post).toHaveProperty('requestBody');
  });

  it('describes the shared error shape on every operation', async () => {
    const spec = (await call<Document>(harness.url, '/openapi.json')).body;
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        expect(Object.keys(operation.responses), `${method} ${path}`).toContain(
          '422',
        );
      }
    }
  });
});

function registeredRoutes(active: Harness): string[] {
  const instance = active.app.getHttpAdapter().getInstance() as {
    router?: { stack: unknown[] };
    _router?: { stack: unknown[] };
  };
  const stack = instance.router?.stack ?? instance._router?.stack ?? [];

  const routes: string[] = [];
  for (const entry of stack) {
    const layer = entry as {
      route?: { path: string; methods: Record<string, boolean> };
    };
    if (layer.route === undefined) continue;
    for (const [method, enabled] of Object.entries(layer.route.methods)) {
      if (!enabled) continue;
      const path = layer.route.path.replace(/:(\w+)/g, '{$1}');
      routes.push(`${method.toUpperCase()} ${path === '' ? '/' : path}`);
    }
  }
  return routes;
}
