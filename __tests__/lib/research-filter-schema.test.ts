import { researchFilterSchema, INDUSTRIES, SUB_INDUSTRIES, GEO_REGIONS } from '@/lib/research-filter-schema';

describe('researchFilterSchema', () => {
  it('accepts valid filter object', () => {
    const result = researchFilterSchema.safeParse({
      industry: 'Technology',
      subIndustry: 'SaaS',
      rateMin: 0,
      rateMax: 2000,
      executionMode: 'hybrid',
    });
    expect(result.success).toBe(true);
  });

  it('rejects rateMin above 5000', () => {
    const result = researchFilterSchema.safeParse({
      rateMin: 6000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid executionMode', () => {
    const result = researchFilterSchema.safeParse({
      executionMode: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});

describe('filter constants', () => {
  it('INDUSTRIES has expected values', () => {
    expect(INDUSTRIES).toContain('Technology');
    expect(INDUSTRIES).toContain('Healthcare');
  });

  it('SUB_INDUSTRIES has Technology sub-industries', () => {
    expect(SUB_INDUSTRIES['Technology']).toContain('SaaS');
    expect(SUB_INDUSTRIES['Technology']).toContain('FinTech');
  });

  it('GEO_REGIONS has expected regions', () => {
    expect(GEO_REGIONS).toContain('MENA');
    expect(GEO_REGIONS).toContain('DACH');
  });
});
