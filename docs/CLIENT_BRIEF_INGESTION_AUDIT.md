# Client Brief Knowledge Ingestion — System Audit & Gap Analysis

**Date:** 2025-02-19  
**Scope:** HuntTriggerSearchPanel equivalent (War Room), paste/submit flows, knowledge ingestion, project creation, global knowledge  
**Objective:** Determine what exists before implementing automatic client-brief ingestion on paste.

---

## PHASE 1 — SYSTEM AUDIT

### 1.1 Naming & Component Mapping

| User Term | Actual Component | Location |
|-----------|------------------|----------|
| HuntTriggerSearchPanel | **WarRoomClient** | `app/hunt/WarRoomClient.tsx` |
| Hunt page | `/hunt` | `app/hunt/page.tsx` |
| Search + Trigger bar | Floating command bar in WarRoomClient | Lines 241–305 |

**Note:** "HuntTriggerSearchPanel" does not exist. WarRoomClient is the equivalent.

---

### 1.2 Existing Components

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| **War Room search input** | ✅ Exists | WarRoomClient.tsx:244–251 | Single `<input>` for query; placeholder "Client brief (e.g. supply chain VP, 15+ years)" |
| **Hunter Trigger button** | ✅ Exists | WarRoomClient.tsx:293–304 | Sends `{ query, projectId, projectTitle }` to `/api/hunter/trigger` |
| **Search button** | ✅ Exists | WarRoomClient.tsx:261–269 | Sends `{ query, page, pageSize, nameFilter }` to `/api/hunter/search` |
| **Project selector** | ✅ Exists | WarRoomClient.tsx:271–292 | Dropdown; projects from `/api/projects` |
| **Event listeners** | ⚠️ Partial | WarRoomClient | `onChange`, `onKeyDown` (Enter → runSearch). **No `onPaste`** |
| **Research filter schema** | ✅ Exists | `lib/research-filter-schema.ts` | industry, subIndustry, countries, regions, rateMin/Max, seniorityMin/Max, yearsExperienceMin/Max, languages, executionMode, brief, query, clientBlacklist, restrictedIndustries |
| **Project creation** | ✅ Exists | `lib/dispatch.ts`, `app/actions/research.ts` | `triggerResearchProject`, `createResearchProject` |
| **Research trigger API** | ✅ Exists | `app/api/research/trigger/route.ts` | POST; uses `triggerResearchProject` |
| **Hunter trigger API** | ✅ Exists | `app/api/hunter/trigger/route.ts` | POST; uses `triggerExpertHunt` (n8n webhook) |
| **Hunter search API** | ✅ Exists | `app/api/hunter/search/route.ts` | pgvector semantic search; requires `expert_vectors` + `linkedinUrl` |
| **n8n webhook** | ✅ Exists | n8n workflow | `/webhook/hunt`; Query mode (AI parser), Collect mode, Rank mode |
| **ConciergeBriefBuilder** | ✅ Exists | `components/research/ConciergeBriefBuilder.tsx` | Conversational brief builder; `suggestFromBrief()` for industry expansion; submits to `/api/research/trigger` |
| **Knowledge graph** | ✅ Exists | `app/graph/KnowledgeGraphClient.tsx` | 3D viz; data from ML service `/api/ml/graph/visualize` |
| **ML graph engine** | ✅ Exists | `ml-service/graph_engine.py` | Builds graph from experts (past_employers, skills) |
| **Audit logs** | ✅ Exists | `audit_logs` table | actor_id, target_id, action, metadata, created_at |
| **ResearchProject schema** | ✅ Exists | `prisma/schema.prisma` | title, status, filterCriteria (JSON), clientBlacklist, restrictedIndustries |

---

### 1.3 Partial Implementations

| Component | What Exists | What's Missing |
|-----------|-------------|----------------|
| **Brief parsing** | ConciergeBriefBuilder: `suggestFromBrief()` (keyword → sub-industries); n8n AI Query Parser (OpenRouter) | No app-side structured extraction (client name, objectives, KPIs, timeline, budget, etc.) |
| **Project creation from brief** | Manual: ConciergeBriefBuilder → form submit; ResearchFilterSidebar → Start Research | No automatic creation on paste; no "paste = ingestion" flow |
| **Filter criteria** | 15-point schema (industry, region, brief, etc.) | No client name, objectives, constraints, KPIs, target audience, competitors, deliverables, timeline, budget |
| **Knowledge storage** | Project `filterCriteria` (JSON); experts in DB; graph from experts | No dedicated "global knowledge" or "client brief intelligence" table |
| **Input type detection** | None | No routing layer to distinguish "client brief" vs "generic search query" |

---

### 1.4 Missing Components

| Component | Status |
|-----------|--------|
| **HuntTriggerSearchPanel** (exact name) | ❌ Does not exist; WarRoomClient is equivalent |
| **Paste event listener** | ❌ No `onPaste` on War Room input |
| **Automatic brief detection** | ❌ No heuristics or AI to detect "client brief" vs search |
| **Structured brief parsing (app-side)** | ❌ No extraction of client name, objectives, KPIs, timeline, budget, etc. |
| **Auto project creation on paste** | ❌ User must click Hunter Trigger or Start Research |
| **Global knowledge database** | ❌ No table for cross-project intelligence; graph is expert-centric only |
| **Expert prefix logic ("Expert: Name")** | ❌ Not implemented anywhere |
| **Version history for briefs** | ❌ No project brief versioning; audit_logs track actions, not brief revisions |
| **Routing layer (brief vs search)** | ❌ Same input used for both Search and Trigger; no type detection |

---

### 1.5 Architectural Conflicts

| Conflict | Description |
|----------|-------------|
| **Single input, dual purpose** | War Room query input serves both (1) semantic search (pgvector) and (2) Hunter Trigger (n8n). No separation of "brief ingestion" vs "search". |
| **Two trigger paths** | `/api/research/trigger` (dispatch, creates project + n8n) vs `/api/hunter/trigger` (n8n only, uses existing project). War Room uses hunter/trigger; Concierge/ResearchFilter use research/trigger. |
| **Project creation gating** | Hunter Trigger requires `selectedProjectId`; if none, user must go to /projects. No auto-create from brief. |
| **Knowledge graph scope** | Graph built from experts (companies, skills); no "client brief" or "project intelligence" nodes. |

---

### 1.6 Refactor Recommendations

1. **Unify trigger semantics** — Decide: does paste/create-brief always create a project, or only when project selected? Align War Room with Concierge flow.
2. **Introduce input-type routing** — Add detection (length, structure, or AI) to route: brief → ingestion pipeline; short query → search.
3. **Extend filterCriteria schema** — Add optional fields: clientName, objectives, constraints, kpis, targetAudience, competitors, deliverables, timeline, budget.
4. **Avoid duplicating n8n AI parser** — n8n already parses query → expert profiles. App can either (a) call n8n and store results, or (b) add app-side parser for structured storage; prefer (a) if n8n is source of truth.

---

### 1.7 Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing Search flow | High | Route by input type; keep Search path unchanged for short queries |
| Breaking Hunter Trigger flow | High | Add paste handler as optional enhancement; default behavior unchanged |
| Duplicating n8n logic | Medium | Use n8n as ingestion orchestrator; app stores structured output |
| Schema migration for new fields | Low | Add optional JSON fields to filterCriteria; no breaking changes |

---

## PHASE 2 — GAP ANALYSIS

### Required Behavior vs Current State

| Required Behavior | Status | Notes |
|-------------------|--------|-------|
| **Detect paste as client brief** | ❌ Not implemented | No onPaste; no paste-specific handling |
| **Treat as structured knowledge ingestion** | ❌ Not implemented | No automatic ingestion pipeline |
| **Deconstruct and reorganize brief** | ⚠️ Partial | n8n AI Query Parser (expert profiles); ConciergeBriefBuilder (industry expansion). No full structured extraction |
| **Create or update project** | ⚠️ Partial | Project creation exists but requires explicit button click |
| **Store in project-level DB** | ✅ Exists | ResearchProject.filterCriteria stores filters |
| **Store in global knowledge DB** | ❌ Not implemented | No global knowledge table |
| **Expert prefix logic ("Expert: Name")** | ❌ Not implemented | No parsing of "Expert: John Doe" |
| **Operate autonomously** | ❌ Not implemented | All flows require user action |
| **Client name extraction** | ❌ Not implemented | |
| **Industry extraction** | ⚠️ Partial | researchFilterSchema.industry; n8n extracts from query |
| **Objectives extraction** | ❌ Not implemented | |
| **Constraints extraction** | ❌ Not implemented | |
| **KPIs extraction** | ❌ Not implemented | |
| **Target audience extraction** | ❌ Not implemented | |
| **Competitors extraction** | ❌ Not implemented | |
| **Deliverables extraction** | ❌ Not implemented | |
| **Timeline extraction** | ❌ Not implemented | |
| **Budget extraction** | ❌ Not implemented | |
| **Semantic entity extraction** | ⚠️ Partial | n8n extracts expert profiles; ML embeddings for search |
| **Update global knowledge graph** | ❌ Not implemented | Graph is expert-centric; no brief/project nodes |
| **Maintain version history** | ❌ Not implemented | No brief versioning |

---

## PHASE 3 — REFACTOR PLAN

### 3.1 Principles

- Reuse existing: dispatch, n8n webhook, ResearchProject, filterCriteria
- Add routing layer for input type (brief vs search)
- Extend schema; avoid breaking changes
- Keep Search and Hunter Trigger backward compatible

### 3.2 Implementation Plan

#### Step 1: Input Type Routing (App-Side)

- Add `detectInputType(text: string): 'brief' | 'search'`
  - Heuristics: length > 200 chars → brief; contains "client", "objective", "KPI", "timeline", "budget" → brief
  - Or: call lightweight AI/OpenRouter for classification (cost tradeoff)
- In WarRoomClient: on Paste, run `detectInputType`. If brief → trigger ingestion flow; if search → do nothing (user can click Search).
- Optional: on Submit (Enter) when type=brief → same ingestion flow.

#### Step 2: Paste Handler

- Add `onPaste` to War Room query input
- On paste: `e.preventDefault()` optional (or allow paste, then run detection)
- If brief: call new API `POST /api/brief/ingest` with `{ rawBrief, projectId? }`

#### Step 3: Brief Ingest API

- New route: `app/api/brief/ingest/route.ts`
- Validates body; optionally calls n8n with `{ projectId, query: rawBrief }` (Query Mode)
- Creates project if no projectId: `triggerResearchProject({ title: brief.slice(0,80), filterCriteria: { brief: rawBrief } })`
- Or: if projectId provided, updates project filterCriteria with parsed fields
- Returns `{ projectId, ingested: true }`

#### Step 4: Schema Extension (Optional)

- Extend `filterCriteria` JSON structure to support:
  - `clientName`, `objectives`, `constraints`, `kpis`, `targetAudience`, `competitors`, `deliverables`, `timeline`, `budget`
- No Prisma migration required if stored as JSON; validate with Zod.

#### Step 5: Global Knowledge (If Required)

- New table: `client_brief_intelligence` or `global_knowledge` (id, source_type, content, extracted_fields JSON, project_id?, created_at)
- Populate from ingest API when brief is processed
- Knowledge graph: extend ML service to optionally add "brief" or "project" nodes (future)

#### Step 6: Expert Prefix Logic

- In ingest parser or n8n: detect lines starting with "Expert:" or "Expert: Name"
- Split into expert names and main brief; send experts as `body.experts` to n8n Collect mode

---

## PHASE 4 — PSEUDOCODE

### Paste Handler (WarRoomClient)

```ts
const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
  const text = e.clipboardData.getData('text');
  if (detectInputType(text) === 'brief') {
    e.preventDefault();
    setQuery(text);
    ingestBrief(text);
  }
};

const ingestBrief = async (rawBrief: string) => {
  setTriggerLoading(true);
  const res = await fetch('/api/brief/ingest', {
    method: 'POST',
    body: JSON.stringify({ rawBrief, projectId: selectedProjectId || undefined }),
  });
  const d = await res.json();
  if (d.projectId) {
    setSelectedProjectId(d.projectId);
    runSearch(); // or refresh projects
  }
  setTriggerLoading(false);
};
```

### Ingest API (High-Level)

```ts
// POST /api/brief/ingest
// 1. Parse body: { rawBrief, projectId? }
// 2. If !projectId: create project via triggerResearchProject({ title, filterCriteria: { brief } })
// 3. If projectId: update project filterCriteria with { brief, ...extracted }
// 4. Call n8n webhook with { projectId, query: rawBrief } (Query Mode)
// 5. Return { projectId, ingested: true }
```

### Input Type Detection (Heuristic)

```ts
function detectInputType(text: string): 'brief' | 'search' {
  const t = text.trim();
  if (t.length > 300) return 'brief';
  const briefKeywords = ['client', 'objective', 'kpi', 'timeline', 'budget', 'deliverable', 'constraint', 'target audience'];
  if (briefKeywords.some(k => t.toLowerCase().includes(k))) return 'brief';
  return 'search';
}
```

---

## PHASE 5 — SCHEMA UPDATES (If Required)

### Option A: Extend filterCriteria (No Migration)

Store in existing `filterCriteria` JSON:

```json
{
  "brief": "raw text",
  "clientName": "Acme Corp",
  "objectives": ["..."],
  "constraints": ["..."],
  "kpis": ["..."],
  "targetAudience": "...",
  "competitors": ["..."],
  "deliverables": ["..."],
  "timeline": "Q2 2025",
  "budget": "50k"
}
```

### Option B: New Table (If Global Knowledge Required)

```prisma
model ClientBriefIntelligence {
  id           String   @id @default(cuid())
  projectId    String?  @map("project_id")
  rawBrief     String   @map("raw_brief") @db.Text
  extracted    Json?    @map("extracted")
  source       String   @default("paste") // paste | api | concierge
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([projectId])
  @@map("client_brief_intelligence")
}
```

---

## Summary

| Deliverable | Status |
|-------------|--------|
| Audit Report | ✅ Complete |
| Gap Analysis Table | ✅ Complete |
| Refactor Plan | ✅ Complete |
| Implementation Plan | ✅ Complete |
| Pseudocode | ✅ Complete |
| Schema Updates | ✅ Proposed (optional) |

**Next Step:** Implement Step 1 (Input Type Detection) and Step 2 (Paste Handler) in WarRoomClient, then add `/api/brief/ingest` route. Reuse existing `triggerResearchProject` and n8n webhook; avoid duplicating n8n AI parsing logic.
