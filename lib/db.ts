/**
 * Neon PostgreSQL connection utility (System Genesis 10.3).
 * Use DATABASE_URL with Neon pooler for serverless. Raw SQL via Prisma.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export { prisma };

export interface SemanticExpertRow {
  expert_id: string;
  similarity: number;
}

/**
 * Semantic Vector Query: pgvector expertise similarity to client brief.
 */
export async function semanticExpertSearch(
  embedding: number[],
  limit: number = 20
): Promise<SemanticExpertRow[]> {
  const vectorStr = `[${embedding.join(',')}]`;
  const rows = await prisma.$queryRawUnsafe<SemanticExpertRow[]>(
    `SELECT expert_id, 1 - (embedding <=> $1::vector) AS similarity
     FROM expert_vectors
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    vectorStr,
    limit
  );
  return rows;
}

export async function query<T = unknown>(sql: Prisma.Sql): Promise<T> {
  return prisma.$queryRaw(sql) as Promise<T>;
}
