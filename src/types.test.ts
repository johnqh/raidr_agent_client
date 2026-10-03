import { describe, it, expect } from 'vitest';
import { QUERY_KEYS } from './types';

describe('QUERY_KEYS', () => {
  it('health key is namespaced', () => {
    expect(QUERY_KEYS.health()).toEqual(['raidr_agent', 'health']);
  });

  it('user key includes the user id', () => {
    const key = QUERY_KEYS.user('user-xyz');
    expect(key).toEqual(['raidr_agent', 'user', 'user-xyz']);
    expect(key[1]).toBe('user');
  });
});
