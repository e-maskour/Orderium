import { describe, it, expect } from 'vitest';
import { resolvePasswordChange, USER_PASSWORD_MIN_LENGTH } from './users.model';

describe('resolvePasswordChange', () => {
  describe('when editing an existing user', () => {
    it('leaves the password untouched when the field is empty', () => {
      expect(resolvePasswordChange('', true)).toEqual({ ok: true });
    });

    it('reports a short password instead of dropping it silently', () => {
      expect(resolvePasswordChange('123456', true)).toEqual({
        ok: false,
        error: 'tooShort',
      });
    });

    it('carries a long enough password through to the payload', () => {
      expect(resolvePasswordChange('TestPass123', true)).toEqual({
        ok: true,
        password: 'TestPass123',
      });
    });

    it('accepts a password of exactly the minimum length', () => {
      const password = 'a'.repeat(USER_PASSWORD_MIN_LENGTH);
      expect(resolvePasswordChange(password, true)).toEqual({
        ok: true,
        password,
      });
    });
  });

  describe('when creating a user', () => {
    it('requires a password', () => {
      expect(resolvePasswordChange('', false)).toEqual({
        ok: false,
        error: 'tooShort',
      });
    });

    it('rejects a short password', () => {
      expect(resolvePasswordChange('short', false)).toEqual({
        ok: false,
        error: 'tooShort',
      });
    });

    it('accepts a long enough password', () => {
      expect(resolvePasswordChange('TestPass123', false)).toEqual({
        ok: true,
        password: 'TestPass123',
      });
    });
  });
});
