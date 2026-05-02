import { describe, it, expect } from 'vitest';
import { checkPageAccess } from '../lib/permissions';

describe('permissions', () => {
  describe('checkPageAccess', () => {
    it('should deny access when no roles provided', () => {
      const result = checkPageAccess({}, [], 'admin');
      expect(result).toBe(false);
    });

    it('should deny access when no permissions found', () => {
      const rolePermissions = {
        '123': { dashboard: true }
      };
      const result = checkPageAccess(rolePermissions, ['123'], 'admin');
      expect(result).toBe(false);
    });

    it('should allow access when permission is true', () => {
      const rolePermissions = {
        '123': { admin: true }
      };
      const result = checkPageAccess(rolePermissions, ['123'], 'admin');
      expect(result).toBe(true);
    });

    it('should deny access when permission is false', () => {
      const rolePermissions = {
        '123': { admin: false }
      };
      const result = checkPageAccess(rolePermissions, ['123'], 'admin');
      expect(result).toBe(false);
    });

    it('should check multiple roles', () => {
      const rolePermissions = {
        '123': { dashboard: true },
        '456': { admin: true }
      };
      expect(checkPageAccess(rolePermissions, ['123'], 'dashboard')).toBe(true);
      expect(checkPageAccess(rolePermissions, ['456'], 'admin')).toBe(true);
      expect(checkPageAccess(rolePermissions, ['999'], 'admin')).toBe(false);
    });
  });
});
