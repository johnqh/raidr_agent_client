import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RaidrAgentClient } from './RaidrAgentClient';
import type { NetworkClient } from '@sudobility/types';

function createMockNetworkClient(
  responseData: unknown = {
    success: true,
    data: null,
    timestamp: '2024-01-01T00:00:00Z',
  }
): NetworkClient {
  const mockResponse = { data: responseData };
  return {
    get: vi.fn().mockResolvedValue(mockResponse),
    post: vi.fn().mockResolvedValue(mockResponse),
    put: vi.fn().mockResolvedValue(mockResponse),
    delete: vi.fn().mockResolvedValue(mockResponse),
  };
}

describe('RaidrAgentClient', () => {
  const baseUrl = 'https://api.example.com';
  let mockNetworkClient: NetworkClient;
  let client: RaidrAgentClient;

  beforeEach(() => {
    mockNetworkClient = createMockNetworkClient();
    client = new RaidrAgentClient({
      baseUrl,
      networkClient: mockNetworkClient,
    });
  });

  describe('constructor', () => {
    it('should create a client instance', () => {
      expect(client).toBeInstanceOf(RaidrAgentClient);
    });
  });

  describe('getUser', () => {
    it('should call GET with correct URL', async () => {
      await client.getUser('user-123', 'token-abc');
      expect(mockNetworkClient.get).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/users/user-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token-abc',
          }),
        })
      );
    });

    it('should return response data', async () => {
      const userData = {
        success: true,
        data: {
          firebase_uid: 'user-123',
          email: 'test@example.com',
          display_name: 'Test',
          created_at: null,
          updated_at: null,
        },
        timestamp: '2024-01-01T00:00:00Z',
      };
      mockNetworkClient = createMockNetworkClient(userData);
      client = new RaidrAgentClient({
        baseUrl,
        networkClient: mockNetworkClient,
      });

      const result = await client.getUser('user-123', 'token');
      expect(result.success).toBe(true);
      expect(result.data!.firebase_uid).toBe('user-123');
    });

    it('should throw on invalid response shape', async () => {
      mockNetworkClient = createMockNetworkClient('not an object');
      client = new RaidrAgentClient({
        baseUrl,
        networkClient: mockNetworkClient,
      });

      await expect(client.getUser('user-123', 'token')).rejects.toThrow(
        'Invalid API response for getUser'
      );
    });
  });

  describe('getHealth', () => {
    it('should call GET /health without auth', async () => {
      await client.getHealth();
      expect(mockNetworkClient.get).toHaveBeenCalledWith(
        'https://api.example.com/health',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
    });

    it('should return response data', async () => {
      mockNetworkClient = createMockNetworkClient({
        success: true,
        data: { status: 'ok', version: '0.0.1' },
        timestamp: '2024-01-01T00:00:00Z',
      });
      client = new RaidrAgentClient({
        baseUrl,
        networkClient: mockNetworkClient,
      });
      const result = await client.getHealth();
      expect(result.data).toEqual({ status: 'ok', version: '0.0.1' });
    });

    it('should throw on invalid response shape', async () => {
      mockNetworkClient = createMockNetworkClient({ foo: 'bar' });
      client = new RaidrAgentClient({
        baseUrl,
        networkClient: mockNetworkClient,
      });
      await expect(client.getHealth()).rejects.toThrow(
        'Invalid API response for getHealth'
      );
    });
  });

  describe('URL construction', () => {
    it('should strip a trailing slash from baseUrl', async () => {
      client = new RaidrAgentClient({
        baseUrl: 'https://api.example.com/',
        networkClient: mockNetworkClient,
      });
      await client.getUser('u1', 'tok');
      expect(mockNetworkClient.get).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/users/u1',
        expect.anything()
      );
    });
  });
});
