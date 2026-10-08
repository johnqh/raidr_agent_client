import { describe, it, expect, vi } from 'vitest';
import type { NetworkClient } from '@sudobility/types';
import { RaidrAgentClient } from './RaidrAgentClient';

function mock(): NetworkClient {
  const res = { data: { success: true, data: {}, timestamp: 'x' } };
  return {
    get: vi.fn().mockResolvedValue(res),
    post: vi.fn().mockResolvedValue(res),
    put: vi.fn().mockResolvedValue(res),
    delete: vi.fn().mockResolvedValue(res),
  };
}

describe('agent flow calls', () => {
  it('posts the request to /intent with the Firebase token', async () => {
    const net = mock();
    await new RaidrAgentClient({
      baseUrl: 'https://a.example',
      networkClient: net,
    }).classifyIntent('recipe for pad thai', 'tok');
    expect(net.post).toHaveBeenCalledWith(
      'https://a.example/api/v1/intent',
      { request: 'recipe for pad thai' },
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      })
    );
  });

  it('encodes the api host and run id', async () => {
    const net = mock();
    const client = new RaidrAgentClient({
      baseUrl: 'https://a.example',
      networkClient: net,
    });
    await client.getSiteAuth('studio-api.suno.com', 'tok');
    await client.getRun('0aae2f31-eb89-4000-8eb0-96f9c7624acc', 'tok');
    await client.getRuns('tok');
    expect(
      (net.get as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0])
    ).toEqual([
      'https://a.example/api/v1/sites/studio-api.suno.com/auth',
      'https://a.example/api/v1/runs/0aae2f31-eb89-4000-8eb0-96f9c7624acc',
      'https://a.example/api/v1/runs',
    ]);
    expect(client.runsUrl()).toBe('https://a.example/api/v1/runs');
  });
});

describe('v2 agent calls', () => {
  it('understands with the device context, prepares, and loads the site context', async () => {
    const net = mock();
    const client = new RaidrAgentClient({
      baseUrl: 'https://a.example',
      networkClient: net,
    });
    const body = {
      request: 'events tonight',
      country: 'US',
      locale: 'en-US',
      timeZone: 'America/Los_Angeles',
      now: '2026-10-08T15:00:00-07:00',
    };
    await client.understandIntent(body, 'tok');
    await client.classifyIntent(body, 'tok');
    const prepare = {
      request: 'events tonight',
      intent: {} as never,
      sites: ['api.lu.ma'],
    };
    await client.prepare(prepare, 'tok');
    await client.getSiteContext('api.lu.ma:8443', 'tok');
    const posts = (net.post as ReturnType<typeof vi.fn>).mock.calls;
    expect(posts[0]!.slice(0, 2)).toEqual([
      'https://a.example/api/v1/intent',
      body,
    ]);
    expect(posts[1]![1]).toEqual(body);
    expect(posts[2]!.slice(0, 2)).toEqual([
      'https://a.example/api/v1/prepare',
      prepare,
    ]);
    expect((net.get as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toBe(
      'https://a.example/api/v1/sites/api.lu.ma%3A8443/context'
    );
  });
});

describe('local mode calls', () => {
  it('posts payload, candidates and import, and gets the manifest', async () => {
    const net = mock();
    const client = new RaidrAgentClient({
      baseUrl: 'https://a.example',
      networkClient: net,
    });
    await client.getLlmPayload(
      { step: 'understand', input: { request: 'x' }, provider: 'openai' },
      'tok'
    );
    await client.getCandidates(['recipes'], 'tok');
    await client.getSiteManifest('localhost:8080', 'tok');
    const run = {
      request: 'x',
      intent: {
        location_needed: false,
        intent: 'search',
        labels: [],
        slots: [],
        resultKind: 'generic' as const,
        query: 'x',
      },
      status: 'done' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      finishedAt: '2026-01-01T00:00:01.000Z',
      sites: [{ apiHost: 'a', status: 'done' as const }],
      calls: [],
      results: [],
    };
    await client.importRun(run, 'tok');
    const posts = (net.post as ReturnType<typeof vi.fn>).mock.calls;
    expect(posts.map(c => [c[0], c[1]])).toEqual([
      [
        'https://a.example/api/v1/llm/payload',
        { step: 'understand', input: { request: 'x' }, provider: 'openai' },
      ],
      ['https://a.example/api/v1/candidates', { labels: ['recipes'] }],
      ['https://a.example/api/v1/runs/import', run],
    ]);
    for (const c of posts)
      expect(c[2].headers).toMatchObject({ Authorization: 'Bearer tok' });
    expect((net.get as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      'https://a.example/api/v1/sites/localhost%3A8080/manifest'
    );
  });
});
