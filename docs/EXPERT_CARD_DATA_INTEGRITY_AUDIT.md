# Expert Card Data Integrity Audit — Root Cause & Fixes

**Date:** 2025-02-19  
**Scope:** Full pipeline audit (DB → Prisma → API → Frontend → Enrichment)

---

## Root Cause Summary

The Expert Profile card was under-populated because of **three distinct failures**:

1. **API omitted fields** — `expertFootprint`, `yearsBySource`, `seniorityFlag`, and `sources` relation were not included in the response.
2. **Frontend rendered a narrow subset** — The component only displayed core identity, rate, seniority, work history (with poor object handling), and engagements. It ignored reputation, subject frequency, reliability, scent signals, sources, skills, and verified badges.
3. **Enrichment did not persist sources** — The n8n callback wrote `pastEmployers`, `linkedinUrl`, `sourceVerified` for new experts but never created `ExpertSource` rows. For existing experts, it did not update or enrich at all.

---

## Database vs API vs Frontend Comparison

| Field | DB (Prisma) | API (before) | API (after) | Frontend (before) | Frontend (after) |
|------|-------------|--------------|-------------|-------------------|------------------|
| pastEmployers | ✓ Json | ✓ | ✓ | ✓ (poor object handling) | ✓ (formatWorkHistoryEntry) |
| skills | ✓ Json | ✓ | ✓ | ✗ | ✓ |
| reputationScore | ✓ | ✓ | ✓ | ✗ | ✓ |
| subjectFrequencyMap | ✓ | ✓ | ✓ | ✗ | ✓ |
| reliabilityIndex | ✓ | ✓ | ✓ | ✗ | ✓ |
| expertFootprint | ✓ | ✗ | ✓ | ✗ | ✓ |
| yearsBySource | ✓ | ✗ | ✓ | ✗ | ✓ (available) |
| seniorityFlag | ✓ | ✗ | ✓ | ✗ | ✓ |
| sources (ExpertSource) | ✓ | ✗ | ✓ | ✗ | ✓ |
| predictedRateRange | ✓ | ✓ | ✓ | ✗ | ✓ |
| averageActualRate | ✓ | ✓ | ✓ | ✗ | ✓ |
| verifiedBadgeProvider | ✓ | ✓ | ✓ | ✗ | ✓ |
| verifiedAt | ✓ | ✓ | ✓ | ✗ | ✓ |
| citationCount | ✓ | ✓ | ✓ | ✗ | ✓ |
| patentCount | ✓ | ✓ | ✓ | ✗ | ✓ |
| professionalAuthorityIndex | ✓ | ✓ | ✓ | ✗ | ✓ |
| sourceVerified (true) | ✓ | ✓ | ✓ | ✗ (only showed when false) | ✓ |

---

## Exact Fixes Applied

### 1. API (`app/api/experts/[id]/route.ts`)

- **Include `sources`** in Prisma query: `sources: { orderBy: { retrievedAt: 'desc' }, take: 10 }`
- **Add to response payload:**
  - `expertFootprint`
  - `yearsBySource`
  - `seniorityFlag`
  - `sources` (id, sourceType, sourceUrl, retrievedAt)

### 2. n8n Callback (`app/api/webhooks/n8n-callback/route.ts`)

- **New experts:** Create `ExpertSource` row when `linkedin_url` is present.
- **Existing experts:**
  - Create `ExpertSource` when `linkedin_url` is present and no LinkedIn source exists.
  - Update expert with `pastEmployers`, `sourceVerified`, `linkedinUrl` when n8n sends new data and expert lacks it.

### 3. Frontend

**WarRoomExpertProfileSheet** (`components/expert/WarRoomExpertProfileSheet.tsx`)

- **Extended `ExpertProfile` interface** to match full API response.
- **Added `formatWorkHistoryEntry()`** to handle both string and object work history entries.
- **New sections:**
  - Rate & Confidence (predictedRateRange, averageActualRate)
  - Reputation & Algorithm Signals (reputationScore, reliabilityIndex, subjectFrequencyMap)
  - Scent Signals (expertFootprint: trailA/B/C/D)
  - Skills
  - Verified Badges (verifiedBadgeProvider, verifiedAt, citationCount, patentCount, professionalAuthorityIndex)
  - Source References (sources with links)
- **Fixed sourceVerified badge** — now shows "Verified" when true, "Unverified" when false.
- **Defensive null handling** — sections render only when data exists; no placeholders for empty data.

**ExpertProfileSheet** (`components/research/ExpertProfileSheet.tsx`) — Command Center
- Replaced Score Breakdown placeholder with real reputation, reliability, subjectFrequencyMap when available.
- Fixed pastEmployers rendering via `formatWorkHistoryEntry` (handles string and object entries).
- Added Source References section when API returns sources.

**ExpertSidePanel** (`components/dashboard/ExpertSidePanel.tsx`) — Dashboard
- Fixed pastEmployers rendering via `formatWorkHistoryEntry`.
- Added Source References section (LinkedIn + other sources) when available.

**Shared utility** (`lib/expert-display.ts`)
- `formatWorkHistoryEntry(e)` — renders string or `{ company, title }` objects correctly.

---

## Schema Corrections

None required. Prisma schema already defines:

- `expertFootprint` (Json)
- `yearsBySource` (Json)
- `seniorityFlag` (String)
- `ExpertSource` model with `expertId`, `sourceType`, `sourceUrl`, `retrievedAt`, `rawPayload`

---

## Updated Expert Card Data Model (API Response)

```ts
{
  id, name, industry, subIndustry, country, region,
  seniorityScore, yearsExperience, predictedRate,
  predictedRateRange: { min?, max?, predicted_rate? } | null,
  reputationScore, subjectFrequencyMap, reliabilityIndex,
  expertFootprint: { trailA?, trailB?, trailC?, trailD? } | null,
  yearsBySource: Record<string, number> | null,
  seniorityFlag: string | null,
  pastEmployers: unknown,
  skills: unknown,
  totalEngagements, averageActualRate,
  sourceVerified, linkedinUrl,
  verifiedBadgeProvider, verifiedAt,
  citationCount, patentCount, professionalAuthorityIndex,
  complianceScore?, mnpiRiskLevel?,
  sources: [{ id, sourceType, sourceUrl, retrievedAt }],
  engagements: [{ id, subjectMatter, date, clientFeedbackScore, actualCost?, durationMinutes? }],
  contacts, ...
}
```

---

## Final Validation Checklist

- [x] API returns `expertFootprint`, `yearsBySource`, `seniorityFlag`
- [x] API includes and returns `sources` relation
- [x] Frontend interface matches API response
- [x] Work history renders strings and objects correctly
- [x] All available fields have corresponding UI sections
- [x] Sections render only when data exists (no fake placeholders)
- [x] n8n callback creates ExpertSource for new and existing experts when linkedin_url present
- [x] n8n callback updates existing experts with pastEmployers, linkedinUrl, sourceVerified when n8n sends new data
- [ ] **Manual:** Run n8n enrichment for a sample expert; verify ExpertSource and pastEmployers in DB
- [ ] **Manual:** Open Expert Profile for sample expert; confirm all sections display when data exists

---

## Enrichment Execution Trace (Phase 4)

| Step | Before | After |
|------|--------|-------|
| n8n scrapes LinkedIn | Sends career_history, linkedin_url, source_verified | Same |
| Callback creates new expert | pastEmployers, linkedinUrl, sourceVerified | + ExpertSource row |
| Callback finds existing expert | ResearchResult only | + ExpertSource if linkedin_url; + expert update if new data |
| API fetches expert | No sources | sources included |
| Frontend renders | Minimal | Full structured data |

---

## Notes

- **expertFootprint** and **yearsBySource** are populated by other pipelines (e.g. Apex Hunter, Scholar). The n8n callback does not write them. When those pipelines run, the data will appear in the card.
- **subjectFrequencyMap**, **reliabilityIndex**, **reputationScore** are computed by backend services (reputation.ts, etc.). They are returned by the API and now rendered.
- No mock or fallback data is used. All displayed fields come from the database.
