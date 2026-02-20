import {
  searchBodySchema,
  ticketBodySchema,
  hunterSearchBodySchema,
  expertsQuerySchema,
} from '@/lib/schemas/api';

describe('searchBodySchema', () => {
  it('accepts valid query and limit', () => {
    const result = searchBodySchema.safeParse({ query: 'test', limit: 10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe('test');
      expect(result.data.limit).toBe(10);
    }
  });

  it('rejects empty query', () => {
    const result = searchBodySchema.safeParse({ query: '' });
    expect(result.success).toBe(false);
  });

  it('defaults limit to 10', () => {
    const result = searchBodySchema.safeParse({ query: 'test' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(10);
  });
});

describe('ticketBodySchema', () => {
  it('requires expertId and ownerId', () => {
    const result = ticketBodySchema.safeParse({ expertId: 'ex1', ownerId: 'own1' });
    expect(result.success).toBe(true);
  });

  it('rejects missing expertId', () => {
    const result = ticketBodySchema.safeParse({ ownerId: 'own1' });
    expect(result.success).toBe(false);
  });

  it('rejects missing ownerId', () => {
    const result = ticketBodySchema.safeParse({ expertId: 'ex1' });
    expect(result.success).toBe(false);
  });
});

describe('hunterSearchBodySchema', () => {
  it('accepts valid body with defaults', () => {
    const result = hunterSearchBodySchema.safeParse({ query: 'AI expert' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(50);
    }
  });

  it('rejects empty query', () => {
    const result = hunterSearchBodySchema.safeParse({ query: '' });
    expect(result.success).toBe(false);
  });
});

describe('expertsQuerySchema', () => {
  it('accepts empty object', () => {
    const result = expertsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts optional projectId and search', () => {
    const result = expertsQuerySchema.safeParse({
      projectId: 'proj-123',
      search: 'engineer',
    });
    expect(result.success).toBe(true);
  });
});
