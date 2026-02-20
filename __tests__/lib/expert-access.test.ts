import { canViewComplianceScore, maskContactValue } from '@/lib/expert-access';

describe('canViewComplianceScore', () => {
  it('returns false when user is null', () => {
    expect(canViewComplianceScore({ user: null })).toBe(false);
    expect(canViewComplianceScore({ user: null, projectCreatorId: 'creator-1' })).toBe(false);
  });

  it('returns true for ADMIN role', () => {
    expect(canViewComplianceScore({ user: { id: 'u1', role: 'ADMIN' } })).toBe(true);
    expect(canViewComplianceScore({ user: { id: 'u1', role: 'SUPER_ADMIN' } })).toBe(true);
  });

  it('returns true when user is project creator', () => {
    expect(
      canViewComplianceScore({
        user: { id: 'creator-1', role: 'CSA' },
        projectCreatorId: 'creator-1',
      })
    ).toBe(true);
  });

  it('returns false when user is not creator and not admin', () => {
    expect(
      canViewComplianceScore({
        user: { id: 'other-user', role: 'CSA' },
        projectCreatorId: 'creator-1',
      })
    ).toBe(false);
  });
});

describe('maskContactValue', () => {
  it('returns empty string for empty input', () => {
    expect(maskContactValue('')).toBe('');
  });

  it('masks email addresses', () => {
    expect(maskContactValue('john@example.com')).toBe('jo***@example.com');
    expect(maskContactValue('a@b.co')).toBe('a***@b.co');
  });

  it('masks phone numbers', () => {
    expect(maskContactValue('+33123456789')).toMatch(/\*\*\*\d{4}$/);
    expect(maskContactValue('1234567890')).toMatch(/\*\*\*\d{4}$/);
  });
});
