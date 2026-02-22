# Expert Identity Resolution — Feature Specification & Implementation Blueprint

**Version:** 1.0  
**Status:** Design Specification  
**Platform:** Expert Intelligence Platform (Next.js, Neon Postgres, n8n, Vercel)

---

## Executive Summary

This document specifies a complete **Clickable Name System** with **Identity Disambiguation** and **Structured Expert Profile Cards** to eliminate ambiguity when multiple individuals share the same name. The system provides high-confidence identity resolution before surfacing a single expert profile.

---

## 1. Clickable Name System

### 1.1 UX Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  User sees expert name (e.g. "John Smith") in:                                │
│  • War Room search results                                                   │
│  • Research results table                                                    │
│  • Project results list                                                      │
│  • Inspector panel / ExpertProfileSheet                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  User CLICKS name (no blind LinkedIn redirect)                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  System checks: linkedinUrl + ExpertCandidate records for this name          │
│  • 0 candidates → Direct to Expert Profile Card (single resolved expert)    │
│  • 1 candidate  → Direct to Expert Profile Card                             │
│  • 2+ candidates → Show DISAMBIGUATION LAYER first                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Backend Architecture

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│  Next.js App     │     │  API Routes         │     │  Services            │
│  (Client)        │────▶│  /api/experts/      │────▶│  IdentityResolver   │
│                  │     │  resolve-by-name   │     │  DisambiguationSvc  │
└──────────────────┘     └─────────────────────┘     └──────────────────────┘
         │                           │                            │
         │                           ▼                            ▼
         │               ┌─────────────────────┐     ┌──────────────────────┐
         │               │  Prisma / Neon       │     │  Enrichment Pipeline │
         └──────────────▶│  experts             │     │  (n8n / background)  │
                         │  expert_candidates  │     └──────────────────────┘
                         │  expert_sources     │
                         └─────────────────────┘
```

### 1.3 Identity Resolution Logic

1. **Primary key:** `experts.id` (internal) — one row per resolved expert.
2. **Name lookup:** Normalize name (lowercase, trim, collapse spaces) → find all `ExpertCandidate` rows with matching normalized name.
3. **Resolution path:**
   - If expert has `linkedinUrl` and no conflicting candidates → treat as resolved.
   - If multiple candidates → disambiguation required.
   - If zero candidates but expert exists → treat as resolved (legacy data).

### 1.4 Data Enrichment Strategy

| Source        | Priority | Data Captured                          | Refresh Cadence |
|---------------|----------|----------------------------------------|-----------------|
| LinkedIn      | 1        | Headline, company, location, photo URL | On collect      |
| Company site  | 2        | Bio, role, team                        | On collect      |
| Google Scholar| 3        | Citations, publications               | Weekly batch     |
| Patents       | 4        | Patent count, titles                   | Monthly         |
| Internal DB   | 5        | Engagements, past employers            | Real-time       |

### 1.5 Confidence Scoring Mechanism

- **Source confidence:** Each source contributes 0–1 (e.g. LinkedIn = 0.9, inferred = 0.3).
- **Completeness:** % of fields populated (photo, headline, company, location, education).
- **Recency:** Decay factor for older data (e.g. 0.95 per month).
- **Composite:** `confidence = (source_avg * 0.4) + (completeness * 0.3) + (recency * 0.3)`.

---

## 2. Disambiguation Layer (Critical Requirement)

### 2.1 Selection Interface Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  "Multiple people with this name — select the one you mean"                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [Photo]  John Smith                    Match: 82%                    │   │
│  │          VP Supply Chain, Acme Corp                                  │   │
│  │          San Francisco, USA · Technology · Stanford MBA              │   │
│  │          Former VP at Walmart. 15+ years in supply chain logistics.  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [Photo]  John Smith                    Match: 71%                    │   │
│  │          Director, Beta Inc.                                         │   │
│  │          London, UK · Finance · Oxford                                │   │
│  │          Investment banking and M&A. 10 years experience.              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [—]     John Smith                    Match: 45%                     │   │
│  │          (Limited data)                                               │   │
│  │          — · — · —                                                    │   │
│  │          Could not retrieve full profile.                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Required Fields per Candidate

| Field              | Required | Fallback                          |
|--------------------|----------|-----------------------------------|
| Profile photo      | No       | Initials avatar                   |
| Current job title  | Yes      | "—" or "Unknown"                  |
| Current company    | Yes      | "—" or "Unknown"                  |
| Location           | Yes      | "—" or "Unknown"                  |
| Industry           | Yes      | From parent expert or "—"         |
| Education (top)    | No       | "—"                               |
| Summary (2–3 lines)| Yes      | "Limited data available"          |
| Confidence score   | Yes      | 0–100%                            |

### 2.3 Ranking Logic

1. **Match score:** Semantic similarity to query brief (highest first).
2. **Confidence:** Higher confidence preferred.
3. **Completeness:** More complete profiles preferred.
4. **Recency:** More recently enriched preferred.

### 2.4 Matching Algorithm Signals

| Signal           | Weight | Description                                      |
|------------------|--------|--------------------------------------------------|
| Company match    | 0.25   | Current employer matches query keywords          |
| Geography match  | 0.20   | Location aligns with filter criteria             |
| Industry match   | 0.20   | Industry/subIndustry matches                     |
| Keyword overlap  | 0.20   | Skills, headline, summary contain query terms    |
| Seniority match  | 0.15   | Years of experience in range                      |

### 2.5 Fallback Strategy

- **Minimal data:** Show all available fields; use "—" for missing; confidence = 0.3–0.5.
- **Conflicting info:** Flag with `seniorityFlag: DISCREPANCY`; show both values; let user choose.
- **Incomplete:** Show "Limited data" badge; allow "View on LinkedIn" as secondary action.

### 2.6 Handling Incomplete/Conflicting Information

- **Conflict:** If `yearsBySource` differs by >2 years → show "DISCREPANCY" badge.
- **Incomplete:** Show "Partially verified" if <50% of core fields populated.
- **Inferred:** Show "Inferred" badge when data comes from ML/assumption only.

---

## 3. Expert Profile Card (Deep Structured View)

### 3.1 Structure

#### A. Core Identity

| Field              | Source        | Notes                    |
|--------------------|---------------|--------------------------|
| Full Name          | experts.name  | —                        |
| Professional headline | enrichment   | headline / title         |
| Current role       | enrichment    | —                        |
| Company (clickable) | enrichment    | Link to company profile  |
| Location           | experts.country/region | —            |
| Profile photo      | enrichment    | —                        |
| Unique ID          | experts.id    | Internal CUID            |

#### B. Verification & Source Transparency

| Field              | Source        |
|--------------------|---------------|
| Source list         | expert_sources.source_type, source_url |
| Source links        | Clickable URLs |
| Date retrieved      | expert_sources.retrieved_at |
| Confidence score    | Computed |
| Verification status | verified / partially_verified / inferred |

#### C. Professional Background

- Work experience timeline (JSON array)
- Education history
- Certifications
- Board memberships
- Advisory roles
- Publications (from Scholar)
- Patents (if applicable)

#### D. Digital Presence

- LinkedIn URL
- Company profile
- Personal website
- Google Scholar
- Twitter/X
- Crunchbase
- Other

#### E. Contextual Metadata

- Areas of expertise (tags)
- Industries
- Seniority level
- Skills
- Languages
- Years of experience
- Notable achievements

#### F. Relationship to Platform

- Why surfaced (matching keywords)
- Relevance explanation
- Associated project/query

---

## 4. Technical Requirements

### 4.1 System Architecture (Text Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js App Router)                                               │
│  • WarRoomClient, ExpertProfileSheet, InspectorPanel                         │
│  • ClickableName component (wraps all expert name displays)                  │
│  • DisambiguationModal, ExpertProfileCard                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  API LAYER                                                                   │
│  • GET  /api/experts/resolve/:idOrName  → resolve expert or disambiguate     │
│  • GET  /api/experts/:id/profile       → full profile (existing + new)      │
│  • POST /api/experts/enrich            → trigger enrichment (async)          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  SERVICE LAYER                                                               │
│  • IdentityResolverService.resolveByName(name, context?)                      │
│  • DisambiguationService.getCandidates(name, projectId?)                     │
│  • EnrichmentPipeline.enqueue(expertId)                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  DATA LAYER (Neon Postgres)                                                  │
│  • experts, expert_vectors, expert_contacts                                  │
│  • expert_candidates (NEW), expert_sources (NEW), expert_snapshots (NEW)     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  EXTERNAL                                                                    │
│  • n8n (enrichment workflows), ML service (ranking), Embedding API            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 API Design

#### REST Examples

**Resolve by name (click handler)**

```
GET /api/experts/resolve?name=John+Smith&projectId=xxx
```

Response (single expert):

```json
{
  "resolved": true,
  "expert": { "id": "cmlx...", "name": "John Smith", ... }
}
```

Response (disambiguation needed):

```json
{
  "resolved": false,
  "candidates": [
    {
      "id": "cmlx...",
      "photoUrl": "https://...",
      "headline": "VP Supply Chain",
      "company": "Acme Corp",
      "location": "San Francisco, USA",
      "industry": "Technology",
      "education": "Stanford MBA",
      "summary": "Former VP at Walmart. 15+ years...",
      "matchScore": 0.82
    }
  ]
}
```

**Full profile**

```
GET /api/experts/:id/profile
```

```json
{
  "id": "cmlx...",
  "name": "John Smith",
  "headline": "VP Supply Chain",
  "currentRole": "VP Supply Chain",
  "company": "Acme Corp",
  "companyUrl": "https://...",
  "location": "San Francisco, USA",
  "photoUrl": "https://...",
  "sources": [
    { "type": "linkedin", "url": "...", "retrievedAt": "2025-02-19T..." },
    { "type": "company_website", "url": "...", "retrievedAt": "2025-02-18T..." }
  ],
  "confidence": 0.85,
  "verificationStatus": "verified",
  "workExperience": [...],
  "education": [...],
  "digitalPresence": { "linkedin": "...", "scholar": "...", ... },
  "platformContext": { "whySurfaced": "...", "projectId": "...", "keywords": [...] }
}
```

### 4.3 Database Schema (New Tables)

```sql
-- Candidates for a given name (before resolution)
CREATE TABLE expert_candidates (
  id            TEXT PRIMARY KEY,
  expert_id     TEXT NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
  normalized_name TEXT NOT NULL,
  source_type   TEXT NOT NULL,  -- 'linkedin', 'company_site', 'manual'
  source_url    TEXT,
  photo_url     TEXT,
  headline      TEXT,
  company       TEXT,
  location      TEXT,
  industry      TEXT,
  education     TEXT,
  summary       TEXT,
  match_score   FLOAT DEFAULT 0,
  confidence    FLOAT DEFAULT 0,
  retrieved_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expert_id, source_type)
);

CREATE INDEX idx_expert_candidates_normalized_name ON expert_candidates(normalized_name);

-- Source provenance for each expert
CREATE TABLE expert_sources (
  id           TEXT PRIMARY KEY,
  expert_id    TEXT NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
  source_type  TEXT NOT NULL,
  source_url   TEXT,
  retrieved_at TIMESTAMPTZ DEFAULT NOW(),
  raw_payload  JSONB
);

CREATE INDEX idx_expert_sources_expert_id ON expert_sources(expert_id);

-- Snapshot for change tracking
CREATE TABLE expert_snapshots (
  id         TEXT PRIMARY KEY,
  expert_id   TEXT NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  payload    JSONB NOT NULL
);

CREATE INDEX idx_expert_snapshots_expert_id ON expert_snapshots(expert_id);
```

### 4.4 Entity Resolution Logic

1. **Normalize name:** `name.toLowerCase().replace(/\s+/g, ' ').trim()`
2. **Fetch candidates:** `SELECT * FROM expert_candidates WHERE normalized_name = $1`
3. **If 0:** Check expert by name in `experts`; if 1 found, return as resolved.
4. **If 1:** Return that expert.
5. **If 2+:** Return disambiguation payload.

### 4.5 Data Normalization

- **Names:** Trim, collapse spaces, lowercase for lookup; preserve original for display.
- **Companies:** Normalize (e.g. "Acme Corp" vs "Acme Corporation") via lookup table.
- **Locations:** City + country; normalize country codes (ISO 3166).

### 4.6 Deduplication Strategy

- **Expert-level:** One `experts` row per resolved person.
- **Candidate-level:** One `expert_candidates` row per (expert_id, source_type).
- **Merge:** When user selects from disambiguation, merge candidate into expert; delete other candidates for that name.

### 4.7 Rate Limit Handling

- **Resolve API:** 60 req/min per user.
- **Enrichment:** Queue-based; 10 concurrent enrichments per project.
- **LinkedIn:** Use n8n delays; respect LinkedIn ToS.

### 4.8 Caching Strategy

- **Resolve by name:** Cache 5 min (Redis or in-memory).
- **Profile:** Cache 30 min; invalidate on enrichment.
- **Disambiguation:** Cache 2 min (candidates can change).

### 4.9 Background Enrichment Pipeline

1. n8n Collect mode scrapes LinkedIn → writes to `expert_sources` + `expert_candidates`.
2. Cron job: `scripts/enrich-stale-experts.ts` runs nightly for experts with low confidence.
3. On user trigger: "Refresh profile" → enqueue enrichment.

### 4.10 Scalability

- **Indexes:** `normalized_name`, `expert_id`, `source_type`.
- **Partitioning:** `expert_snapshots` by month if volume grows.
- **Read replicas:** For profile reads; primary for writes.

### 4.11 Privacy & Compliance

- **GDPR:** Right to erasure; anonymize on delete.
- **Scraping:** Use official APIs where possible; respect robots.txt; rate limit.
- **PII:** Store only necessary; encrypt in transit/at rest.
- **Audit:** Log all profile views and resolutions.

---

## 5. AI/Matching Logic

### 5.1 Identity Disambiguation Scoring Formula

```
score(candidate, query) =
  0.25 * company_match(candidate, query) +
  0.20 * geo_match(candidate, query) +
  0.20 * industry_match(candidate, query) +
  0.20 * keyword_overlap(candidate, query) +
  0.15 * seniority_match(candidate, query)
```

### 5.2 Weighted Scoring System

| Factor     | Weight | Implementation                          |
|------------|--------|------------------------------------------|
| Company    | 0.25   | Jaccard similarity on company names      |
| Geography  | 0.20   | Country match = 1; region match = 0.5    |
| Industry   | 0.20   | Exact match = 1; subIndustry match = 0.7 |
| Keywords   | 0.20   | TF-IDF or embedding cosine on headline+summary |
| Seniority  | 0.15   | Years in range = 1; close = 0.5          |

### 5.3 Confidence Threshold Logic

- **≥ 0.85:** Auto-resolve (skip disambiguation).
- **0.50–0.84:** Show disambiguation.
- **< 0.50:** Show disambiguation with "Low confidence" warning.

### 5.4 Edge Case Handling

- **No data:** All candidates get confidence 0.3; rank by recency.
- **Tie:** Secondary sort by `retrieved_at` DESC.
- **Conflicting sources:** Average confidence; flag DISCREPANCY.

### 5.5 False Positive Reduction

- Require at least 2 matching signals for auto-resolve.
- Human-in-the-loop for scores 0.50–0.70 (existing PendingIntervention).
- Log corrections for model retraining.

### 5.6 Explainability Layer

Return `matchReasons` array:

```json
{
  "matchReasons": [
    { "signal": "company_match", "value": "Acme Corp", "score": 0.25 },
    { "signal": "geo_match", "value": "USA", "score": 0.20 },
    { "signal": "keyword_overlap", "value": "supply chain", "score": 0.18 }
  ]
}
```

### 5.7 Pseudocode

```
function resolveByName(name: string, projectId?: string):
  normalized = normalize(name)
  candidates = db.query("SELECT * FROM expert_candidates WHERE normalized_name = ?", normalized)

  if candidates.length == 0:
    expert = db.query("SELECT * FROM experts WHERE normalized_name = ? LIMIT 1", normalized)
    if expert: return { resolved: true, expert }
    return { resolved: false, candidates: [], error: "No expert found" }

  if candidates.length == 1 and candidates[0].confidence >= 0.85:
    return { resolved: true, expert: fetchExpert(candidates[0].expert_id) }

  ranked = rankCandidates(candidates, projectId)
  return { resolved: false, candidates: ranked }

function rankCandidates(candidates, projectId):
  for c in candidates:
    c.matchScore = computeMatchScore(c, projectContext(projectId))
  return sort(candidates, by: c.matchScore, DESC)
```

---

## 6. UX & UI Specifications

### 6.1 Interaction Flow

1. User sees name in list/table → name is a link (underline on hover, cursor pointer).
2. User clicks → loading state (skeleton or spinner).
3. If resolved → open Expert Profile Card (modal or sheet).
4. If disambiguation → show Disambiguation Modal with candidate cards.
5. User selects candidate → open Expert Profile Card for that expert.
6. User can "View on LinkedIn" from card (external link).

### 6.2 Card Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  [Photo]  Name                    [Verification badge]       │
│           Headline · Company                                 │
│           Location                                           │
├─────────────────────────────────────────────────────────────┤
│  Sources & Confidence                                       │
│  [LinkedIn] [Company] [Scholar]  Retrieved: 2025-02-19       │
│  Confidence: 85% · Verified                                  │
├─────────────────────────────────────────────────────────────┤
│  Professional Background | Digital Presence | Platform       │
│  [Tabs]                                                    │
│  Work experience timeline...                                 │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Visual Hierarchy

- **Primary:** Name, headline, photo.
- **Secondary:** Company, location, confidence.
- **Tertiary:** Sources, timeline, metadata.

### 6.4 Mobile Responsiveness

- Single column; stacked layout.
- Disambiguation: full-width cards; tap to select.
- Profile: collapsible sections.

### 6.5 Loading States

- Skeleton for profile card (photo, name, headline placeholders).
- Spinner for resolve API (200–500ms).

### 6.6 Error States

- "Could not load profile" with retry.
- "No expert found" with search suggestion.
- "Multiple matches — please select" (disambiguation).

### 6.7 Empty States

- "No work history" → "No data available".
- "No sources" → "Profile not yet enriched".

### 6.8 Accessibility

- WCAG 2.1 AA.
- Keyboard navigation: Tab through candidates; Enter to select.
- Screen reader: announce "3 people with this name; select one".
- Focus trap in modal.

---

## 7. Advanced Enhancements

### 7.1 AI-Generated Expert Summary

- Use LLM to generate 2–3 sentence summary from headline + work + education.
- Store in `expert_summary`; refresh on enrichment.

### 7.2 Compare Experts Mode

- Side-by-side view of 2–3 experts.
- Compare: match score, rate, seniority, skills, location.

### 7.3 Timeline Visualization

- Horizontal timeline of work experience.
- Education overlay.

### 7.4 Network Graph View

- Graph of experts by shared employers, skills, projects.
- Already partially: `ExpertNetworkGraph`, `ExpertGraph3D`.

### 7.5 Smart Filtering

- Filter disambiguation by location, industry, company.
- Sort by match, confidence, recency.

### 7.6 Save-to-Shortlist

- "Add to shortlist" from card.
- Shortlist = project-specific ResearchResult.

### 7.7 Notes & Tagging

- Per-expert notes (already in InspectorPanel).
- Tags: custom labels (e.g. "Top pick", "Follow up").

### 7.8 Audit Trail

- Log: who viewed profile, when, from which project.
- AuditLog table extension.

### 7.9 Change Tracking Over Time

- `expert_snapshots` table: snapshots on enrichment.
- "View history" in profile: diff of key fields.

---

## 8. Implementation Phases

### Phase 1: Foundation (2–3 weeks)

- [ ] Add `expert_candidates`, `expert_sources` tables.
- [ ] Create `ClickableName` component.
- [ ] Create `GET /api/experts/resolve` endpoint.
- [ ] Create `IdentityResolverService`.
- [ ] Wire War Room name column to ClickableName.

### Phase 2: Disambiguation (2 weeks)

- [ ] Create `DisambiguationModal` component.
- [ ] Implement ranking logic.
- [ ] Wire resolve API to disambiguation flow.
- [ ] Add `expert_sources` writes from n8n Collect.

### Phase 3: Profile Card (2–3 weeks)

- [ ] Extend `GET /api/experts/:id` with profile payload.
- [ ] Create `ExpertProfileCard` (full structured view).
- [ ] Add verification & source transparency section.
- [ ] Add digital presence section.

### Phase 4: Enrichment & Polish (2 weeks)

- [ ] Background enrichment pipeline.
- [ ] Confidence scoring.
- [ ] Loading/error/empty states.
- [ ] Mobile responsiveness.

### Phase 5: Advanced (2+ weeks)

- [ ] AI summary.
- [ ] Compare mode.
- [ ] Change tracking.
- [ ] Audit trail.

---

## Appendix A: Existing Schema Mapping

| New Concept        | Existing Field / Table              |
|--------------------|-------------------------------------|
| linkedinUrl        | experts.linkedin_url                |
| currentEmployer    | experts.current_employer            |
| pastEmployers      | experts.pastEmployers (JSON)        |
| skills             | experts.skills (JSON)               |
| industry/subIndustry | experts.industry, subIndustry     |
| country/region    | experts.country, region             |
| seniorityFlag      | experts.seniorityFlag               |
| yearsBySource      | experts.yearsBySource               |
| citationCount      | experts.citationCount               |
| patentCount        | experts.patentCount                  |

---

## Appendix B: Glossary

- **Disambiguation:** Process of distinguishing among multiple people with the same name.
- **Confidence score:** 0–1 measure of data quality and source reliability.
- **Match score:** 0–1 measure of relevance to query/project.
- **Verification status:** verified | partially_verified | inferred.
- **Expert candidate:** A row in `expert_candidates` representing one possible identity for a name.
