/**
 * Input type detection for War Room: distinguish client brief vs generic search query.
 * Used to route paste/submit events to ingestion pipeline vs semantic search.
 */

export type InputType = 'brief' | 'search';

const BRIEF_KEYWORDS = [
  'client',
  'objective',
  'objectives',
  'kpi',
  'kpis',
  'timeline',
  'budget',
  'deliverable',
  'deliverables',
  'constraint',
  'constraints',
  'target audience',
  'competitor',
  'competitors',
  'scope',
  'background',
  'context',
  'requirement',
  'requirements',
];

const BRIEF_LENGTH_THRESHOLD = 200;

/**
 * Detect whether pasted/submitted text is a structured client brief or a short search query.
 * Heuristics: length, presence of brief-like keywords.
 */
export function detectInputType(text: string): InputType {
  const t = text.trim();
  if (!t) return 'search';

  if (t.length >= BRIEF_LENGTH_THRESHOLD) return 'brief';

  const lower = t.toLowerCase();
  const keywordCount = BRIEF_KEYWORDS.filter((k) => lower.includes(k)).length;
  if (keywordCount >= 2) return 'brief';
  if (keywordCount >= 1 && t.length > 80) return 'brief';

  return 'search';
}
