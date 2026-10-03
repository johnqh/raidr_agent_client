import { describe, it, expect } from 'vitest';
import {
  createAuthHeaders,
  createHeaders,
  buildUrl,
  handleApiError,
} from './raidr-agent-helpers';

describe('raidr-agent-helpers', () => {
  describe('createAuthHeaders', () => {
    it('should include Authorization Bearer token', () => {
      const headers = createAuthHeaders('my-token-123');
      expect(headers.Authorization).toBe('Bearer my-token-123');
    });

    it('should include Content-Type application/json', () => {
      const headers = createAuthHeaders('token');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should include Accept application/json', () => {
      const headers = createAuthHeaders('token');
      expect(headers.Accept).toBe('application/json');
    });

    it('should have exactly 3 headers', () => {
      const headers = createAuthHeaders('token');
      expect(Object.keys(headers)).toHaveLength(3);
    });
  });

  describe('createHeaders', () => {
    it('should include Content-Type application/json', () => {
      const headers = createHeaders();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should include Accept application/json', () => {
      const headers = createHeaders();
      expect(headers.Accept).toBe('application/json');
    });

    it('should not include Authorization', () => {
      const headers = createHeaders();
      expect(headers.Authorization).toBeUndefined();
    });

    it('should have exactly 2 headers', () => {
      const headers = createHeaders();
      expect(Object.keys(headers)).toHaveLength(2);
    });
  });

  describe('buildUrl', () => {
    it('should join base URL and path', () => {
      const url = buildUrl('https://api.example.com', '/api/v1/users');
      expect(url).toBe('https://api.example.com/api/v1/users');
    });

    it('should strip trailing slash from base URL', () => {
      const url = buildUrl('https://api.example.com/', '/api/v1/users');
      expect(url).toBe('https://api.example.com/api/v1/users');
    });

    it('should handle localhost with port', () => {
      const url = buildUrl('http://localhost:8022', '/api/v1/histories/total');
      expect(url).toBe('http://localhost:8022/api/v1/histories/total');
    });

    it('should handle path with route params', () => {
      const userId = 'user-123';
      const historyId = 'hist-456';
      const url = buildUrl(
        'https://api.example.com',
        `/api/v1/users/${userId}/histories/${historyId}`
      );
      expect(url).toBe(
        'https://api.example.com/api/v1/users/user-123/histories/hist-456'
      );
    });
  });

  describe('handleApiError', () => {
    it('should extract error from response data', () => {
      const response = { data: { error: 'Not authorized' } };
      const error = handleApiError(response, 'fetch histories');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Failed to fetch histories: Not authorized');
    });

    it('should extract message from response data', () => {
      const response = { data: { message: 'Server error' } };
      const error = handleApiError(response, 'create history');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Failed to create history: Server error');
    });

    it('should prefer error over message', () => {
      const response = {
        data: { error: 'Primary error', message: 'Secondary' },
      };
      const error = handleApiError(response, 'update');
      expect(error.message).toBe('Failed to update: Primary error');
    });

    it('should handle missing error and message', () => {
      const response = { data: {} };
      const error = handleApiError(response, 'delete');
      expect(error.message).toBe('Failed to delete: Unknown error');
    });

    it('should handle null response', () => {
      const error = handleApiError(null, 'fetch');
      expect(error.message).toBe('Failed to fetch: Unknown error');
    });

    it('should handle undefined response', () => {
      const error = handleApiError(undefined, 'fetch');
      expect(error.message).toBe('Failed to fetch: Unknown error');
    });
  });
});
