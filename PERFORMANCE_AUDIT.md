# Zyra — Performance Audit

> Generated: 2026-06-01  
> Scope: Frontend bundle, backend queries, admin over-fetching, AI computation, import pipeline

---

## Findings

### Frontend

#### F1 — PersonalDashboard: Multiple Parallel API Calls on Mount
**File**: `src/hooks/useDashboardSummary.js`, `useDashboardAnalytics.js`, `useDashboardInsights.js`  
**Pattern**: PersonalDashboard mounts three separate hooks that each fire independent API requests to `/api/users/summary`, `/api/users/analytics`, and `/api/users/insights`. These three endpoints all internally call `buildPersonalFinanceSnapshot()`, which runs a large set of parallel Prisma queries.

**Problem**: Three separate requests → three full snapshot computations. No shared computation layer between them. The snapshot (all memberships, all expenses, all payments) is re-fetched and re-processed three times on every PersonalDashboard page load.

#### F2 — PlansPage: Largest Single Route File (28KB, 649 lines)
**File**: `src/pages/PlansPage.jsx`  
**Pattern**: Everything lives in one file — plan cards, AI generator panel, AI plan board, create modal, edit modal, convert modal, expense rows, participant input. All components render together.

**Problem**: Large single-file component has high parsing cost. All modal components (CreatePlanModal, EditPlanModal, etc.) are mounted unconditionally in the render tree even when closed. `AnimatePresence` wraps multiple lists and panels simultaneously, increasing the number of Framer Motion observers on this page.

#### F3 — Dashboard.jsx (Room): 20KB, Chart-Heavy
**File**: `src/pages/Dashboard.jsx`  
**Pattern**: Room dashboard includes inline Chart.js/Recharts charts, balance cards, expense lists, and summary cards in a single 20KB file.

**Problem**: Chart components initialize on every room visit regardless of whether there is data to display. No virtualization for expense list items. No code-splitting within the room dashboard — the entire component tree loads synchronously.

#### F4 — AppContext: Full Rooms Reload on Every Mutation
**File**: `src/context/AppContext.jsx` (16KB)  
**Pattern**: `AppContext` manages the global rooms list, current room state, expenses, members, and guests. Many mutations call a full reload of `rooms` after any change (membership approval, room creation, etc.).

**Problem**: Room list reload fetches all memberships and room metadata even if only one room changed. There is no optimistic update or incremental cache invalidation — the entire list is re-fetched from `/api/rooms`.

#### F5 — Chart-Heavy Pages Without Memoization
**Files**: `AnalyticsDashboard.jsx`, `MonthlyTrendChart.jsx`, `CategoryBreakdown.jsx`  
**Pattern**: Chart components receive processed data arrays as props. No `useMemo` guards on the processed data transformations. No `React.memo` on chart subcomponents.

**Problem**: Every parent re-render (which can be triggered by unrelated context changes in AppContext) causes chart components to re-process data and re-render, even when the underlying data hasn't changed.

#### F6 — AICopilotPage Route Alias
**File**: `src/App.jsx` lines 137, 141  
**Pattern**: Both `/insights` and `/copilot` lazy-load `AICopilotPage`. Two separate lazy import chains resolve to the same component.

**Problem**: React lazy creates two separate module references. If both routes are ever visited in the same session, the component bundle is loaded once but the lazy boundary state may be duplicated. Minor memory overhead.

#### F7 — No Bundle Analysis / Vendor Chunk Strategy
**File**: `vite.config.js`  
**Pattern**: Vite default chunking. No explicit `manualChunks` for heavy dependencies (Framer Motion, Recharts, xlsx).

**Problem**: The `xlsx` library (Excel import/export) and `recharts` are likely bundled into the main vendor chunk, increasing initial parse time even for users who never use import or charts. Circular vendor chunk warnings mentioned in the original audit are likely still present.

---

### Backend

#### B1 — `buildPersonalFinanceSnapshot()` Full-History Load (No Pagination)
**File**: `backend/services/personalFinanceSnapshotService.js`  
**Pattern**: Loads ALL memberships, ALL expense participations, ALL payments across ALL of a user's rooms in one query batch. Used by `analyticsService`, `personalSummaryService`, `personalInsightService`, `copilotEngine`, and `temporalSignals`.

**Problem**: As expense count grows (e.g. 2+ years of active use across 5+ rooms), this becomes a full-table scan on `Expense` + `ExpenseParticipant` for the user's entire history. No time-window bound. No pagination. The `analyticsService` then iterates all results in-memory to build 12-month series. This is the single highest-risk query in the entire system.

#### B2 — `buildAdminOverview()`: 10 Parallel DB Queries With No Cache
**File**: `backend/services/adminOperationsService.js` lines 12–44  
**Pattern**: Fires `Promise.all([count(), count(), count(), count(), count(), count(), count(), findMany(), listOperational(), listOperational()])` — 10 queries on every admin overview page load.

**Problem**: The admin overview is loaded every time the admin navigates to `/admin`. No cache, no TTL. On a busy system with thousands of operational events, the `listOperationalEvents` queries (up to 300 events filtered) will be slow. All 10 queries run in parallel on the single SQLite connection.

#### B3 — `buildTrendData()`: 14-Day Full Scan on Every Admin Trends Request
**File**: `backend/services/adminMutationsService.js` lines 203–247  
**Pattern**: Fetches ALL operational events in the last 14 days, ALL expenses in the last 14 days, ALL rooms in the last 14 days — then buckets them in JavaScript.

**Problem**: Depending on event volume, `db.operationalEvent.findMany({ where: { createdAt: { gte: fourteenDaysAgo } } })` could return thousands of rows. All bucketing is done in application memory. No index on just `createdAt` alone — the compound indexes include `source` or `type` as leading column, so a bare `createdAt >= x` filter may not benefit from them.

#### B4 — `buildAiObservability()`: Up to 120 Operational Events Loaded and Filtered in Memory
**File**: `backend/services/adminOperationsService.js` lines 139–162  
**Pattern**: `listOperationalEvents({ where: { source: 'ai' }, take: 120 })` → all 120 events loaded → filtered in JS for different sub-types.

**Problem**: The DB-level filter is only on `source: 'ai'` with a `take: 120` limit. Additional sub-type filtering (parser vs. recommendation vs. copilot) is done in JavaScript. If the DB has 120+ AI events, the filtering loses events that occur outside the 120-record window.

#### B5 — `analyticsService`: `detectRecurringCandidates()` O(N²) Group Pattern
**File**: `backend/services/analyticsService.js` lines 172–201  
**Pattern**: Groups all `participantShares` by normalized title + category, then for each group computes gaps, cadence, and coefficient of variation.

**Problem**: This is O(N log N) in the sorting step, but the normalization and grouping runs for every expense in the user's history. For users with thousands of expenses, this runs a string normalization pass on every item. Combined with the full-history load in B1, this is the slowest part of the analytics pipeline.

#### B6 — `temporalSignals.js`: Full In-Memory Statistical Processing (551 Lines)
**File**: `backend/services/intelligence/temporalSignals.js`  
**Pattern**: Pure compute module; no DB access. But operates on all expenses passed to it (full history after snapshot).

**Problem**: When called inside `getOrRefreshProfile()`, this function processes all expenses, builds month series, computes 9 different signal types (each iterating the expense array), and returns a large object. For users with 500+ expenses across 3+ years, this is a significant CPU computation. No worker thread or streaming — runs synchronously in the Express event loop.

#### B7 — Settlement Computation Per Request (No Caching)
**File**: `backend/utils/settlement.js`  
**Pattern**: Called every time the Settlements page is loaded or a payment is recorded. Runs the net-balance computation for all room members across all expenses and payments.

**Problem**: No caching on settlement results. Every page load recomputes from scratch. For rooms with many expenses (100+), this is an expensive computation on every visit, especially if the room is in active use.

#### B8 — Missing DB Indexes on `Expense`
**File**: `backend/prisma/schema.prisma`  
**Pattern**: `Expense` has no explicit indexes beyond the implicit primary key and foreign keys.

**Problem**: The following query patterns are common and unindexed:
- `WHERE roomId = x` (room expense list, settlement computation)
- `WHERE date >= start AND date <= end` (monthly analytics, temporal signals)
- `WHERE createdByUserId = x` (user expense counts)
- `WHERE paidByUserId = x` (settlement pathfinder)

On SQLite with hundreds of expenses per room, these become sequential scans.

---

### Admin

#### A1 — Admin Overview: No Caching, Expensive Parallel Queries
**Covered in B2.** Every admin dashboard visit triggers 10 parallel DB queries with no TTL cache. Admin overview data (user count, room count, today's events) does not need millisecond freshness.

#### A2 — Admin Rooms/Users Lists: No Cursor Pagination
**File**: `backend/services/adminMutationsService.js` lines 118–199  
**Pattern**: `listUsers` and `listRooms` use `skip`/`take` offset pagination.

**Problem**: Offset pagination on SQLite requires the DB to count/skip rows to reach the target page. For large page numbers (e.g., admin inspecting page 50 of 1,000 users), this degrades significantly. Cursor-based pagination would be more efficient.

#### A3 — Admin Per-Room Inspection: 2 Extra Queries Per Room Click
**File**: `backend/services/adminOperationsService.js` `inspectAdminRoom()` lines 187–258  
**Pattern**: Room inspection loads room details → then fires 2 additional queries in parallel: operational events for room + financial profiles for all room members.

**Problem**: No caching on room inspection. Every time admin opens a room modal, all three queries run fresh. If the room has many members, the `financialProfile.findMany({ where: { userId: { in: userIds } } })` query scans profiles for all members simultaneously.

---

### AI

#### AI1 — Temporal Signal Computation Blocks Event Loop
**Covered in B6.** `buildTemporalSignals()` is a synchronous CPU-intensive computation on all user expenses. It runs in the Express request handler (no worker thread, no queue). For a user with a large expense history, this could block other concurrent requests for 50–200ms.

#### AI2 — Copilot Cache Not Invalidated on Expense Write
**Covered in CURRENT_STATE.md (In Progress).** After adding an expense, the copilot cache still returns the pre-expense state for up to 5 minutes. Users who add an expense and immediately check the copilot workspace will see outdated recommendations.

#### AI3 — FinancialProfile Recomputed Synchronously on Cache Miss
**File**: `backend/services/intelligence/personalFinanceProfileService.js`  
**Pattern**: `getOrRefreshProfile(userId)` checks DB for cached profile → if stale/missing, runs the full analytics snapshot + temporal signals computation synchronously before responding.

**Problem**: First-time copilot load or post-recompute admin action triggers a full blocking computation on the request thread. No background queue; the HTTP response waits for the full profile to be built.

#### AI4 — Gemini API Calls Are Synchronous (No Streaming)
**File**: `backend/services/ai/gemini.js`  
**Pattern**: Gemini calls use `generateContent()` in structured JSON mode. Full response is awaited before returning.

**Problem**: For plan generation (potentially 10–15 itemized plan rows), Gemini response latency can be 3–8 seconds. The HTTP connection is held open for the entire duration. No streaming to the frontend; the user sees a loading spinner until the full response arrives.

---

### Import

#### IM1 — Full Buffer In-Memory Parsing (No Streaming)
**File**: `backend/services/import/excelImportParser.js` line 20  
**Pattern**: `xlsx.read(buffer, { type: 'buffer' })` reads the entire file into memory at once.

**Problem**: Large Excel files (e.g., 5MB with 5,000+ rows) are held entirely in server RAM during parsing. No streaming or chunked processing. For a shared server with 1GB RAM, multiple concurrent large imports could exhaust memory and trigger PM2's `max_memory_restart` limit (300MB process limit).

#### IM2 — No File Size Limit on Import Upload
**File**: Routes for import  
**Pattern**: The general JSON limit is 100KB, but Excel file uploads likely use a different content-type. If the import endpoint accepts raw binary uploads, there is no documented file size cap.

**Problem**: Without an explicit file size limit on multipart/binary uploads, a malicious or careless user could upload a very large Excel file, causing memory exhaustion on the 1GB VPS.

#### IM3 — Import Commit Is Transactional But Not Chunked
**File**: `backend/services/import/importCommitService.js`  
**Pattern**: All validated rows are committed in a single Prisma transaction.

**Problem**: For imports with 200+ rows, a single large transaction holds the SQLite write lock for the entire duration, blocking all other write operations (expense creation, payment recording) during the commit. On a single-process SQLite deployment, this causes all other requests to queue.

---

## Severity

| ID | Finding | Severity |
|---|---|---|
| B1 | Personal analytics full-history load, no pagination | 🔴 High |
| B8 | Missing DB indexes on `Expense` | 🔴 High |
| IM1 | Full buffer Excel import (no streaming) | 🔴 High |
| IM2 | No file size limit on import uploads | 🔴 High |
| B2 | Admin overview: 10 parallel queries, no cache | 🟠 Medium |
| B3 | Admin trends: 14-day full scan in memory | 🟠 Medium |
| F1 | PersonalDashboard: 3 parallel snapshot computations | 🟠 Medium |
| B5 | `detectRecurringCandidates()` O(N) string normalization | 🟠 Medium |
| B6 | `temporalSignals.js` blocks event loop | 🟠 Medium |
| AI3 | FinancialProfile recomputed synchronously on cache miss | 🟠 Medium |
| IM3 | Import commit single large transaction (write lock) | 🟠 Medium |
| F2 | PlansPage: 28KB single-file, all modals always mounted | 🟡 Low |
| F3 | Dashboard.jsx: 20KB, charts without virtualization | 🟡 Low |
| F4 | AppContext: full room list reload on mutation | 🟡 Low |
| F5 | Chart components lack useMemo/React.memo | 🟡 Low |
| B4 | AI observability: 120-event JS filter loses data | 🟡 Low |
| B7 | Settlement recomputed per request | 🟡 Low |
| A1 | Admin overview no cache (same as B2) | 🟠 Medium |
| A2 | Admin lists: offset pagination on SQLite | 🟡 Low |
| A3 | Admin room inspection: 3 queries per modal open | 🟡 Low |
| AI2 | Copilot cache not invalidated on expense write | 🟠 Medium |
| AI4 | Gemini API no streaming (3–8s cold call) | 🟡 Low |
| F7 | No bundle analysis / vendor chunk strategy | 🟡 Low |

---

## Recommended Fixes

### Critical Path (Do First)

**DB Indexes on Expense table** (B8)
```prisma
// Add to schema.prisma Expense model
@@index([roomId, date])
@@index([createdByUserId])
@@index([paidByUserId])
```

**File Size Limit on Import** (IM2)
```js
// Add multer or busboy limit
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max
```

**Time-Window Bound on Personal Analytics** (B1)
```js
// Limit analytics to last 24 months instead of full history
const since = new Date();
since.setMonth(since.getMonth() - 24);
// Pass 'since' to snapshot query
```

**Admin Overview Cache** (B2)
```js
let adminOverviewCache = null;
let adminOverviewExpiry = 0;
const ADMIN_CACHE_TTL = 2 * 60 * 1000; // 2 min

export async function buildAdminOverview() {
  if (adminOverviewCache && Date.now() < adminOverviewExpiry) return adminOverviewCache;
  adminOverviewCache = await _buildAdminOverview();
  adminOverviewExpiry = Date.now() + ADMIN_CACHE_TTL;
  return adminOverviewCache;
}
```

**Copilot Cache Eviction Hook** (AI2)
```js
// In expenseWriteService.js, after successful expense creation:
import { clearCopilotCache } from '../copilot/copilotEngine.js';
clearCopilotCache(userId);
```

### High Value / Medium Effort

**PersonalDashboard: Single Snapshot Endpoint** (F1)
- Create `/api/users/dashboard` that returns `{ summary, analytics, insights }` in one call
- Eliminates 2 of 3 snapshot computations on every PersonalDashboard load

**Import: Chunked Commit Transaction** (IM3)
```js
// Commit in batches of 50 rows
for (let i = 0; i < rows.length; i += 50) {
  await prisma.$transaction(rows.slice(i, i + 50).map(row => createExpenseOp(row)));
}
```

**Bundle Optimization** (F7)
```js
// vite.config.js
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-xlsx': ['xlsx'],
        'vendor-charts': ['recharts'],
        'vendor-motion': ['framer-motion'],
      }
    }
  }
}
```

**Temporal Signals in Worker Thread / Background Queue** (AI3, B6)
- Move `buildTemporalSignals()` + `getOrRefreshProfile()` to a background job that runs on schedule or on demand, storing result in `FinancialProfile`
- HTTP response returns cached profile immediately; stale profiles are refreshed asynchronously

---

## Quick Wins

These can be implemented in < 1 day with significant measurable impact:

| Win | Effort | Impact |
|---|---|---|
| Add `@@index([roomId, date])` to `Expense` in schema.prisma | 15 min | Room analytics 2–10× faster |
| Add file size limit (5MB) to import upload route | 30 min | Eliminates memory exhaustion risk |
| Add 2-min TTL cache to `buildAdminOverview()` | 30 min | Admin dashboard 10 parallel queries → 1 every 2 min |
| Call `clearCopilotCache(userId)` in `expenseWriteService.js` | 15 min | Copilot recommendations reflect new expenses immediately |
| Add `rollupOptions.manualChunks` for xlsx + recharts | 30 min | Smaller initial bundle; xlsx not loaded until import is triggered |
| Consolidate PersonalDashboard into single `/api/users/dashboard` endpoint | 2–4 hours | Reduces snapshot computation from 3× to 1× on dashboard load |
| Add time-window bound (24 months) to snapshot queries | 1–2 hours | Limits personal analytics to relevant data window |
