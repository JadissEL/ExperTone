# Expert Intelligence Platform - Test Suite

Autonomous tests for Step 5 (Command Center) and related components.

## Run Tests

```bash
npm test
```

## Watch Mode (development)

```bash
npm run test:watch
```

## Coverage

```bash
npm run test:coverage
```

## Test Structure

| Suite | Coverage |
|-------|----------|
| `stores/useResearchStore.test.ts` | Zustand store: setActiveProject, setFilters, setResults, appendResults, setActiveTab, setSelectedExpertId, setOpenTicketFor, reset |
| `lib/research-filter-schema.test.ts` | Zod schema validation, INDUSTRIES, SUB_INDUSTRIES, GEO_REGIONS |
| `components/research/ResearchFilterSidebar.test.tsx` | Renders filters, region toggles, execution mode, form submit → API |
| `components/research/ExpertMasterTable.test.tsx` | Empty state, expert count, search input |
| `components/research/ExpertProfileSheet.test.tsx` | Hidden when no selection, expert from store, Score Breakdown, Past Work History, Relationship Graph |
| `components/research/TicketModal.test.tsx` | Renders when open, Cancel/Submit, API call on submit |

## CI Integration

Add to your CI pipeline:

```yaml
- run: npm test
```

Tests run without external services (DB, n8n, ML). Fetch calls are mocked.
