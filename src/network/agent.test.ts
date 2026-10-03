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
