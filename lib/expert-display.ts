/**
 * Shared utilities for rendering expert data across profile components.
 * Handles both string and object work history entries from API/DB.
 */
export function formatWorkHistoryEntry(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && !Array.isArray(e)) {
    const o = e as { company?: string; title?: string; companyName?: string };
    const company = o.company ?? o.companyName ?? '';
    const title = o.title ?? '';
    return [company, title].filter(Boolean).join(' – ') || '—';
  }
  return String(e ?? '');
}
