# ChatGPT Prompt: Aurena WBS Goal Extraction for AI Flow Lab

Copy everything below the line into ChatGPT. Paste the response back to Claude.

---

You are the **Architect** for AI Flow Lab, a 7-step automation pipeline (architect → critique → synthesize → execute → propose-followups → pr-draft → merge). Your job right now: analyze the full context of the **aurena-wbs** project and produce a set of **Goals** that can be imported into AI Flow Lab.

## What is a Goal in AI Flow Lab?
A Goal is a high-level objective that spawns one or more Tasks. Each Task goes through the 7-step pipeline. Goals should be:
- Vertically sliced (one Goal = one shippable increment)
- Ordered by dependency (earlier Goals must complete before later ones that depend on them)
- Specific enough that the `architect` step can produce a concrete implementation spec
- Each Goal should have 1–4 Tasks maximum

## Output Format (STRICT — Claude will parse this)
Return ONLY a JSON array. No markdown fences, no commentary before or after. Each goal object:

```json
[
  {
    "id": "G-001",
    "title": "Short goal title",
    "description": "2-3 sentence description of what this goal achieves and why it matters.",
    "priority": "P1|P2|P3",
    "depends_on": [],
    "tasks": [
      {
        "title": "Task title",
        "lane_type": "feature|bug|test|danger",
        "description": "What exactly to implement, including files to touch.",
        "acceptance_criteria": ["criterion 1", "criterion 2"]
      }
    ]
  }
]
```

## Lane Types
- **feature** — New functionality, API routes, lib modules, UI. Executor: Codex.
- **bug** — Fix broken behavior. Executor: Claude.
- **test** — Coverage expansion, new test files. Executor: Codex.
- **danger** — Schema migrations, normalization pipeline changes, anything touching invariants. Executor: Claude (extra caution).

## Full Project Context

### What aurena-wbs IS
A warehouse management and product-resolution system for a cosmetics/beauty wholesale business. Handles the full lifecycle: goods receipt → normalization → product matching → approval gate → inventory posting.

### Tech Stack
- pnpm monorepo: `apps/web` (Next.js 16, React 19, TS 5, Tailwind 4) + `packages/domain` (pure types)
- Database: SQLite via Drizzle ORM + better-sqlite3 (local dev), PostgreSQL for production (planned)
- Testing: Vitest with in-memory test doubles, 173 tests across 10 files
- All root scripts delegate to `apps/web`: `pnpm dev/build/lint/typecheck/test`

### 5-Layer Architecture (dependencies flow upward only)
```
Layer 5: Application / Workflow  (API routes, UI pages)
Layer 4: Inventory               (StockMovement, quantity tracking)
Layer 3: Product Resolution      (ProductVariant matching, EAN/SKU lookup)
Layer 2: Normalization / Logistics (ImportedItemLine, normalization pipeline, Shipment)
Layer 1: Evidence                (StagedRawLine, DocumentUpload, raw data capture)
```

### Non-Negotiable Invariants
1. Internal IDs only — all cross-references use internal UUIDs, never external codes
2. No direct import-to-stock — every item must pass through ApprovalBatch gate
3. lineType from CI × PL cross-reference — never set manually
4. Source priority: XLSX > CI > PL > BL > EMAIL > SCAN
5. Normalization is idempotent — re-running produces same result
6. Approval is atomic — entire batch approved/rejected, no partial
7. Enrichment suggestions must flow through review, never auto-overwrite master data
8. articleCode may be NULL in valid cases — don't silently reject
9. Keep lineage intact — downstream objects traceable to evidence
10. ReviewQueueItem is a domain object, not a UI artifact

### Domain Entities
| Entity | Layer | Purpose |
|--------|-------|---------|
| StagedRawLine | 1 | Raw line from scanned/uploaded document |
| DocumentUpload / SourceDocument | 1 | File metadata + SHA-256 fingerprint |
| ImportedItemLine | 2 | Normalized, validated line ready for matching |
| Shipment | 2 | Groups lines by physical delivery (1 XLSX = 1 Shipment) |
| ProductVariant | 3 | Canonical product (brand + product + variant) |
| ProductAlias | 3 | Confirmed alias mappings (ARTICLE_CODE, FACTORY_NO) |
| ReviewQueueItem | 3 | Blocking reason code per reviewable row |
| ApprovalBatch | 4 | Explicit approval gate records |
| StockMovement | 4 | Ledger entries (IN/OUT/MOVE/COUNT/ADJ/RETURN/DAMAGE) |

### What IS Already Implemented (17 completed slices)
1. Domain core types in `packages/domain`
2. Auction ingest → StagedRawLine (XLSX read, tokenization, pre-validation)
3. Profile normalization + promotion (AUCTIONS lineType heuristics)
4. Test fixtures + Vitest calibration
5. Pure mapping AuctionNormalizedEntry → ImportedItemLine
6. Persistence: Shipment, source document, staged_raw_line, imported_item_line
7. Re-import cleanup + API (POST /api/auction-ingest)
8. ReviewQueueItem persistence + listing (GET /api/review-queue)
9. Review resolution workflow (PATCH /api/review-queue/:id)
10. Review status propagation + re-import reopen semantics
11. Product resolution stub (exact canonical matching)
12. Re-import match invalidation
13. Manual match + alias persistence (PATCH /api/imported-item-line/:id/match)
14. Product resolution trigger + FACTORY_NO alias (POST /api/product-resolve)
15. ApprovalBatch boundary (POST /api/approval-batches)
16. Approval invalidation on re-import
17. StockMovement / ledger posting (POST /api/stock-movements/from-approved-imports)

### Existing API Routes (7)
- `POST /api/auction-ingest` — multipart XLSX upload
- `GET /api/review-queue` — filterable by status/reasonCode
- `PATCH /api/review-queue/:id` — resolve/override review item
- `PATCH /api/imported-item-line/:id/match` — manual match + alias learning
- `POST /api/product-resolve` — trigger auto-resolution on PENDING lines
- `POST /api/approval-batches` — create approval batch
- `POST /api/stock-movements/from-approved-imports` — post IN movements

### What is NOT Yet Implemented
- Movement cancellation / rollback
- OUT / MOVE / COUNT / ADJ / RETURN / DAMAGE movements
- Valuation / costing logic
- Container lookup/creation (containerId stays null)
- Location table (locationId is raw string)
- ProductVariant CRUD (populated via direct DB inserts only)
- INBOUND_DOCS / TRANSFERS / OUTBOUND source profiles
- Structural rejection in pre-validator
- Alias conflict resolution
- Batch listing/query endpoints
- Pagination on listing APIs
- Authentication
- UI beyond default Next.js page
- Production database (PostgreSQL)
- OCR, Dropbox integration, freight allocation

### Candidate Next Slices (from project docs)
A. Movement cancellation (cancel endpoint + auto-cancel on approval invalidation)
B. Container lookup/creation (Container table, lookup-or-create)
C. ProductVariant CRUD (admin endpoints)
D. Location management (Location table)
E. Ledger query endpoints (read model for stock levels, movement history)
F. Structural rejection in pre-validator

### Open Boundary Questions
1. Movement cancellation: if re-import clears approval, should existing StockMovements be cancelled?
2. Location management: should a Location table exist for validation?
3. Alias conflicts: what happens when same aliasValue maps to different variant?
4. Match ambiguity: multiple variants with same canonicalArticleCode — undefined order
5. Quantity/unit validation against ProductVariant reference values
6. Pagination strategy for all listing APIs
7. Authentication strategy

## Your Task
Analyze the full project state and produce **5–8 Goals** (ordered by priority and dependency) that represent the most logical next development steps. Consider:
- What's the highest-value next slice given what's already built?
- What foundational pieces are missing that block multiple features?
- What has explicit boundary questions that need answering first?
- Keep the "build small vertical slices" principle

Focus on the NEXT logical phase of development. Don't try to plan the entire product roadmap — just the next 5–8 shippable increments.

Return ONLY the JSON array.
