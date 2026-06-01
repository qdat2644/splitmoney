# Zyra — Full Project Architecture & Product Audit Report v2

> Generated: 2026-06-01  
> Previous audit covered: SplitEasy (pre-rebrand baseline)  
> This document supersedes `audit_report.md`

---

## Executive Summary

**Zyra** is a premium, context-aware personal financial management and group expense-splitting application designed primarily for Vietnamese-speaking users. The application has evolved significantly beyond its original "SplitEasy" baseline and is now approaching late-stage pre-production maturity.

**What Zyra is today:**
Zyra is a full-stack, AI-augmented financial platform that unifies group expense rooms, personal analytics dashboards, intelligent forecasting, planning boards, and an operational admin workspace into a single coherent product. It is built on a Node.js/Express/Prisma/SQLite backend with a React 18 + Vite frontend served as a single binary deployment.

**Target User:**
- Roommate groups splitting recurring household bills
- Vietnamese travel groups planning trips and tracking per-person costs
- Event organizers managing multiple participant budgets
- Individual users seeking an AI-enhanced personal spending overview

**Product Positioning:**
Zyra occupies a unique intersection between group ledger tools (Splitwise) and personal finance dashboards (YNAB) while adding a Vietnamese-first AI layer (Gemini 2.5 Flash). The product is not a prototype — it is a functional, hardened application with security controls, a test suite, a working admin workspace, and a production-ready deployment stack.

**Maturity Level:** `Late Beta / Pre-Production`
- Core feature areas: complete and stable
- Admin observability: complete and operational
- AI systems: functional with deterministic fallbacks
- Coverage gaps: ForecastsPage/SettingsPage are stubs; mobile UX not tested; no E2E test suite

---

## Product Features

### Personal Finance
- **Personal Dashboard** (`PersonalDashboard.jsx`, ~17KB): Aggregates active rooms, net balances, current-month spending, recent transactions across all rooms without manual calculations
- **Spending Velocity Indicator**: Real-time daily spend rate (spent/days elapsed), projected month-end total
- **12-Month Trend Charts**: Monthly spending series with category and room breakdowns
- **Top Categories & Top Rooms**: Ranked spending aggregates across the user's entire portfolio
- **Net Balance Hero Card**: Displays current cross-room net position with trend direction

### Budgets
- **User-Scoped Budgets**: Monthly budgets per category or overall, attached to a specific user
- **Room-Scoped Budgets**: Monthly budgets scoped to a room context
- **Budget Health Engine**: Compares current month spending against budgets; surfaces over-budget and at-risk states
- **Budget Comparison Layer**: `buildBudgetComparisonFromData` in `budgetService.js` processes real-time spend vs. limit for every tracked category

### Forecasting
- **Month-End Forecast**: Extrapolates current-month-to-date spend rate projected to end-of-month; weighted by 3-month moving average
- **Category-Level Forecast**: Per-category projection based on current month pace vs. historical average
- **Room-Level Forecast**: Per-room projection same methodology
- **Budget Risk Detection**: Identifies categories/rooms projected to breach budget before month ends
- **Confidence Score**: Bounded [0.35, 0.90] based on historical data density and days elapsed in month
- **ForecastsPage** (`/forecasts`): Currently renders the full `AnalyticsDashboard` component (functional but labeled as "Dự báo")

### AI Copilot
- **Copilot Workspace** (`/copilot` or `/insights`): Full AI recommendation dashboard showing prioritized action items, opportunities, planning intelligence, room signals, financial memory, and forecast snapshots
- **Top Priorities Panel**: Top 4 deduplicated recommendations ranked by severity and confidence
- **Opportunities Panel**: Lower-priority improvements and behavioral patterns
- **Financial Memory Panel**: Persisted spending profile (style, volatility, budget discipline, temporal trend, top categories)
- **Temporal Pills**: Active signals derived from time-based memory
- **Copilot Cache**: 5-minute in-memory TTL cache per user to prevent redundant Gemini/analytics calls
- **Recommendation Engine**: Three-tier system — Risk (`riskEngine.js`), Opportunity (`opportunityEngine.js`), Temporal (`recommendationEngine.js`) — merged, deduplicated, and sorted by priority

### AI Temporal Intelligence
- **TemporalSignals Engine** (`temporalSignals.js`, 551 lines): Most sophisticated module in the codebase. Produces:
  - Month-over-month direction and delta
  - Rolling 7-day trend vs. prior 7 days
  - Weekend vs. weekday spending pattern
  - End-of-month concentration pattern
  - Recurring payment detection (weekly/monthly/irregular cadence)
  - Category momentum (up/down vs. prior month)
  - Volatility trend (stabilizing/more_variable/stable)
  - Budget adherence trend
  - Import behavior shift detection (pre/post import baseline comparison)
- **All signals include confidence scores** calibrated by data density, imported history boost, and data sparsity guards
- **FinancialProfile persistence**: JSON-encoded profile stored in `FinancialProfile` table with `lastComputedAt` timestamp; refreshed on demand

### AI NLP Parser
- **Vietnamese Expense Parser** (`parser.js`): Sends colloquial Vietnamese text to Gemini 2.5 Flash for parsing into structured expense objects
- **Deterministic Fallback** (`fallback.js`, `utils.js`): Local regex engine handles Vietnamese shorthand amounts (1tr2, 500k, 1 củ, 1 triệu, etc.) and collective pronouns (tôi, mình, cả nhà, anh em)
- **Schema Validation** (`schema.js`, `validator.js`): Structured JSON schema enforced on Gemini output; falls back on schema violation

### AI Insight Generator
- **Insight Generator** (`insightGenerator.js`): Synthesizes personal summary, forecast data, anomalies, and budget health into 5 concise Vietnamese insights (max 40 words each) via Gemini
- **Static Fallback Rules** (`insightRules.js`): Deterministic Vietnamese insight rules triggered when Gemini unavailable
- **Privacy Masking**: All data serialized through `profileSerializer.js` which strips emails, names, identifiers, and raw amounts before Gemini API calls

### AI Plan Generator
- **AI Plan Generator** (`planGenerator.js`): Takes user inputs (destination, trip type, duration, preferences, participant count) + anonymized profile context → returns structured plan with itemized expense estimates, categories, and risk warnings
- **Plan Board** (`AIPlanBoard.jsx`): Review/edit generated plan items, adjust amounts, add/remove items before saving
- **AIPlanGeneratorPanel** (`AIPlanGeneratorPanel.jsx`): Input form for AI plan generation (destination, type, duration, budget, preferences)

### Shared Rooms
- **Room Creation & Join**: Rooms created by owners; members join via room code; membership requires approval
- **Room Guard** (`RoomGuard` in `App.jsx`): Client-side guard that validates membership before rendering room routes; handles deep-link refresh
- **Expense Management**: Full CRUD with Equal/Exact/Percentage split types; supports User and Guest payers/participants
- **Room Dashboard** (`Dashboard.jsx`, ~20KB): Per-room expense summary, balance cards, recent transactions
- **Member Management** (`Members.jsx`): Approve/reject pending members, view member balances
- **Settlement Engine** (`settlement.js`, 8.3KB): Zero-sum net-balance pathfinder that minimizes bilateral payments for circular debt resolution
- **Settlement Page** (`Settlements.jsx`): Renders optimized settlements with payment recording modal
- **Analytics Page** (`Analytics.jsx`): Per-room analytics (category breakdown, spending trends)
- **Import Excel** (`ImportExcelModal.jsx` + import services): Excel file upload for bulk expense import into a room

### Guest Members
- **Guest Creation**: Room owners/members can create virtual guest profiles for non-registered participants
- **Guest Claim**: Real users can claim guest identities, merging past balances into their account
- **Claim Security**: Double-claim prevention (HTTP 409); display name lock after claim; auto-release on member ejection

### Financial Plans
- **Plan CRUD**: Create/edit/delete plans with name, type (trip/party/event/moving/wedding/custom), dates, description
- **Plan Status Lifecycle**: draft → active → completed → archived
- **Plan Expenses**: Add/edit/delete itemized expense estimates within a plan; supports Equal/Exact split types
- **Plan Participants**: User, guest, or manually-named participants; propagates to plan expenses
- **Plan-to-Room Conversion** (`ConvertExpenseModal.jsx`): One-click conversion of planned expense items into real room expenses with participant mapping
- **Participant Sync**: When plan participants change, unconverted plan expenses are updated automatically

### Import/Export
- **Excel Import Pipeline**:
  - `excelImportParser.js` (540 lines): Auto-detects header row (within first 20 rows), classifies columns (title/amount/payer/date/category/participants/member columns), handles merged cells, secondary header rows, summary rows, and legacy footer patterns
  - `importPreviewService.js`: Produces preview with per-row warnings, confidence scores, payer/participant resolution status
  - `memberResolver.js`: Fuzzy-matches imported source names to actual room members/guests
  - `importCommitService.js`: Transactional bulk commit of validated import rows into expenses
  - `importValidators.js`: Pre-commit validation rules
  - Admin observability: Import events logged as `OperationalEvent` records; visible in Admin Imports tab
- **CSV/JSON Export** (`exportService.js`): Room export (expenses + payments) and personal export (expenses + budgets + plans) in both CSV and JSON formats

### Admin Workspace
- **Admin Routes**: Protected by `requireAuth` + `requireAdmin` middleware; accessible only to users with `role: "admin"`
- **Admin Overview Tab** (`AdminOverviewTab.jsx`): System-wide metrics — total users, active rooms, today's expenses/payments, AI parser success rate, import warning rate, pending memberships, security signals, recent anomalies
- **Admin Users Tab** (`AdminUsersTab.jsx`): Paginated user list with search/filter; per-user inspection modal (room memberships, AI profile status, recent signals); suspend/reactivate/role-change actions
- **Admin Rooms Tab** (`AdminRoomsTab.jsx`): Paginated room list; per-room inspection modal (member list, guest list, import history, AI temporal memory status); archive/reopen actions
- **Admin AI Tab** (`AdminAITab.jsx`): AI observability — parser usage, fallback rate, recommendation volume, AI adoption, temporal profile health; trigger AI profile recompute
- **Admin Imports Tab** (`AdminImportsTab.jsx`): Import observability — today's imports, failed imports, warning-heavy imports, unresolved mappings, average confidence; recent import event log
- **Admin Security Tab** (`AdminSecurityTab.jsx`): Security signals — failed auth attempts, denied cross-room mutations, rate limit hits, suspicious import failures, guest claim conflicts
- **Admin Audit Log Tab** (`AdminAuditTab.jsx`): Immutable audit trail of all admin actions (user.suspend, room.archive, ai.recompute, user.role_change, etc.)
- **Admin Trends** (`buildTrendData`): 14-day daily bucket charts for AI usage, import activity, security events, expense creation, room creation

### Operational Events System
- **OperationalEvent model**: Tracks real-time system events (AI parser runs, import events, security violations, admin actions) with type, source, severity, userId, roomId, metadata fields
- **Indexes**: Compound indexes on `[source, createdAt]`, `[type, createdAt]`, `[roomId, createdAt]`, `[userId, createdAt]`
- **AuditTrail model**: Separate immutable log for admin-originated mutations (never deleted) with indexes on actorId, targetType, actionType

---

## Architecture

### Frontend Architecture

**Framework**: React 18 + Vite (fast HMR dev server, ESM bundling)  
**Styling**: Tailwind CSS with curated dark-mode design system  
**Animation**: Framer Motion (layout animations, AnimatePresence transitions)  
**Icons**: Lucide React  
**Charts**: Recharts (in AnalyticsDashboard)  
**HTTP Client**: Axios (in `apiClient.js` service)  
**State**: React Context (`AppContext.jsx` ~16KB for global room/user state; `AuthContext.jsx` for auth state)

**Key Patterns:**
- **Lazy Loading**: `PlansPage`, `BudgetPage`, `AICopilotPage`, `ForecastsPage`, `SettingsPage`, `AdminWorkspace` are all lazy-loaded with `Suspense`
- **Custom Hooks**: `useBudgets`, `usePlans`, `useCopilotWorkspace`, `useDashboardAnalytics`, `useDashboardInsights`, `useDashboardSummary`, `useRoomMembers`, `useToast`, `useConfirm`, `useLocalStorage`
- **RoomGuard**: URL-driven room context guard; prevents blank-screen on F5 deep-link; handles `local` legacy room ID
- **AdminGuard**: `user.role === 'admin'` check; redirects to `/` if not admin
- **Component Structure**: Organized by domain — `auth/`, `budget/`, `charts/`, `copilot/`, `dashboard/`, `expenses/`, `import/`, `layout/`, `members/`, `personal/`, `plans/`, `settlements/`, `ui/`
- **UI Primitives**: Shared `AppButton`, `AppCard`, `AppInput`, `AppSelect`, `ModalLayout`, `PageHeader`, `EmptyState`, `Skeleton`, `Toast` components in `ui/`

**Routes:**
```
/                  → PersonalDashboard
/insights          → AICopilotPage
/copilot           → AICopilotPage (alias)
/rooms             → RoomList
/plans             → PlansPage
/budget            → BudgetPage
/forecasts         → ForecastsPage (→ AnalyticsDashboard)
/settings          → SettingsPage (stub)
/admin/*           → AdminWorkspace (admin only)
/rooms/:roomId/*   → RoomGuard → RoomRoutes
  /dashboard       → Dashboard (room)
  /expenses        → Expenses
  /members         → Members
  /settlements     → Settlements
  /analytics       → Analytics (room-level)
```

### Backend Architecture

**Framework**: Node.js 18+ / Express  
**ORM**: Prisma (type-safe query builder)  
**Database**: SQLite (`dev.db`, 364KB current)  
**Auth**: JWT (jsonwebtoken) + BcryptJS  
**Security**: Helmet, CORS, compression, express-rate-limit  
**AI**: @google/genai (Gemini 2.5 Flash)  
**Process**: PM2 fork mode (single process, `zyra-backend`)

**Layered Architecture:**
```
Router → Middleware → Controller → Service → Prisma ORM → SQLite
```

**Route Namespaces (13 total):**
```
/api/auth                   → authRoutes (authLimiter)
/api/rooms                  → roomRoutes
/api/rooms/:id/expenses     → expenseRoutes
/api/rooms/:id/import       → importRoutes
/api/rooms/:id/guests       → guestRoutes
/api/rooms/:id/payments     → paymentRoutes
/api/rooms/:id/ai           → aiRoutes (aiLimiter)
/api/users                  → userRoutes + analyticsRoutes
/api/budgets                → budgetRoutes
/api/plans                  → planRoutes
/api/export                 → exportRoutes
/api/admin                  → adminRoutes (requireAuth + requireAdmin)
/health                     → health check endpoint
```

**Middleware Stack:**
- `helmet()` — security headers
- `cors(corsOptions)` — origin whitelist
- `compression()` — gzip
- `express.json({ limit: '100kb' })` — payload guard
- `requestLogger` — structured request logging
- `generalLimiter` — 300 req/15min global cap
- `authLimiter` — 20 req/15min on auth routes
- `aiLimiter` — 20 req/1min on AI routes
- `requireAuth` — JWT validation; logs `security.auth_failed` events
- `requireAdmin` — role check for admin routes
- `blockSuspended` — optional suspended user guard on write routes
- `roomMiddleware` — room membership validation for room-scoped routes
- `errorHandler` — global error normalizer

**Controllers (13 total):**
`adminController`, `aiController`, `analyticsController`, `authController`, `budgetController`, `expenseController`, `exportController`, `guestController`, `importController`, `paymentController`, `planController`, `roomController`, `userController`

**Services (organized by domain):**
- **Analytics**: `analyticsService.js` (409 lines) — full personal analytics pipeline
- **Intelligence**: `temporalSignals.js` (551 lines), `profileSignals.js`, `profileInferenceEngine.js`, `profileSerializer.js`, `personalFinanceProfileService.js`
- **AI**: `insightGenerator.js`, `parser.js`, `planGenerator.js`, `fallback.js`, `gemini.js`, `schema.js`, `validator.js`, `utils.js`, `provider.js`
- **Copilot**: `copilotEngine.js`, `copilotSerializer.js`, `recommendationEngine.js`, `riskEngine.js`, `opportunityEngine.js`
- **Import**: `excelImportParser.js` (540 lines), `importPreviewService.js`, `importCommitService.js`, `importValidators.js`, `memberResolver.js`
- **Admin**: `adminOperationsService.js` (456 lines), `adminMutationsService.js` (289 lines)
- **Core**: `analyticsService.js`, `budgetService.js`, `planningService.js` (339 lines), `paymentService.js`, `expenseWriteService.js`, `exportService.js`
- **Events**: `operationalEventService.js`, `auditTrailService.js`
- **Snapshots**: `personalFinanceSnapshotService.js`, `personalSummaryService.js`, `personalInsightService.js`

### Database Architecture

**Provider**: SQLite (Prisma ORM)  
**Database file**: `backend/prisma/dev.db` (364KB current)  
**Models (11 total):**

| Model | Purpose |
|---|---|
| `User` | Core user account (id, name, email, passwordHash, role, status) |
| `Room` | Expense group (name, code, ownerId, status) |
| `RoomMember` | User↔Room join (role, status: pending/approved/rejected, claimGuestMemberId) |
| `Expense` | Single expense (amount, splitType, paidBy, category, date, participants) |
| `ExpenseParticipant` | User or guest share for a given expense (shareAmount always in VND) |
| `GuestMember` | Virtual non-registered participant (status: active/claimed/removed) |
| `Payment` | Settlement payment record (from→to, amount, paidAt) |
| `Plan` | Financial plan (type, status lifecycle, estimatedTotal, participants) |
| `PlanExpense` | Itemized plan line (estimatedAmount, splitType, participants JSON, convertedToExpenseId) |
| `Budget` | Monthly budget limit (userId, roomId?, category?, amount, month, year) |
| `FinancialProfile` | Persisted AI-computed user profile (JSON blob, lastComputedAt) |
| `PasswordResetToken` | SHA-256 hashed reset tokens with expiry |
| `OperationalEvent` | Real-time system event log (type, source, severity, userId, roomId, metadata JSON) |
| `AuditTrail` | Immutable admin action log (actorId, actionType, targetType, targetId, metadata JSON) |

**Key Indexes:**
- `OperationalEvent`: `[source, createdAt]`, `[type, createdAt]`, `[roomId, createdAt]`, `[userId, createdAt]`
- `AuditTrail`: `[actorId, createdAt]`, `[targetType, targetId]`, `[actionType, createdAt]`
- `RoomMember`: unique `[roomId, userId]`
- `User`: unique `email`
- `Room`: unique `code`
- `FinancialProfile`: unique `userId`
- `PasswordResetToken`: unique `tokenHash`

**Notable Design Decisions:**
- `Budget` uniqueness enforced at application level (not DB `@@unique`) due to nullable compound constraint issues with Prisma/SQLite
- `PlanExpense.participants` stored as JSON-encoded string (not a separate join table)
- `OperationalEvent.metadata` stored as JSON-encoded string
- All monetary amounts stored as `Float` in VND (integer-resolution)

### AI Architecture

**Model**: Google Gemini 2.5 Flash (`@google/genai`)  
**Pattern**: Hybrid AI + Deterministic Fallback

```
User Action
    │
    ▼
API Key Present & Rate OK?
    ├─ No → Deterministic Fallback (regex / rule-based)
    └─ Yes → Gemini 2.5 Flash (structured JSON mode)
                 │
                 ▼
           Schema Validation
                 ├─ Invalid → Fallback
                 └─ Valid → Privacy Sanitizer → Response
```

**Three Gemini Workflows:**
1. **Vietnamese NLP Parser**: Coloquial text → structured expense objects
2. **AI Plan Generator**: Trip/event parameters + anonymized profile → itemized plan with cost estimates
3. **Personal Insight Generator**: Analytics summary + forecast + anomalies → 5 Vietnamese insights

**Financial Profile Pipeline:**
```
User Expenses + Budgets
    → buildTemporalSignals() [temporalSignals.js]
    → profileSignals.js [spending style, volatility, budget discipline]
    → profileInferenceEngine.js [infer personality traits]
    → profileSerializer.js [strip PII for Gemini]
    → FinancialProfile (DB, cached)
    → copilotEngine.js → buildRecommendations()
```

**Copilot Recommendation Sources:**
- `riskEngine.js`: Budget overrun, velocity alerts, debt worsening signals
- `opportunityEngine.js`: Budget optimization, recurring expense tracking opportunities
- `recommendationEngine.js`: Temporal signals (rolling 7-day trend, category momentum, recurring patterns, improvements)
- All merged, deduplicated via token-overlap similarity scoring, sorted by `severity × confidence × priorityBoost`

---

## User Flows

### Onboarding
1. User visits app → `AuthScreen` (login/register forms)
2. Register: POST `/api/auth/register` → bcrypt hash → JWT issued → redirect to `/`
3. Login: POST `/api/auth/login` → password verify → JWT issued → redirect to PersonalDashboard
4. Forgot password: POST `/api/auth/forgot-password` → SHA-256 token stored → email sent (generic success response to prevent enumeration)
5. Reset: POST `/api/auth/reset-password` → token validated → new password set → token invalidated

### Expense Creation
1. User enters a room via `/rooms/:roomId/dashboard`
2. Clicks "Add Expense" → `AddExpenseModal` opens
3. Choose split type (`SplitTypeSelector`): equal, exact, or percentage
4. Select payer (user or guest), participants, amount, category, date, optional note
5. POST `/api/rooms/:roomId/expenses` → `expenseController` → `expenseWriteService` → `resolveShares()` → DB write
6. AppContext updates expenses; dashboard refreshes

### AI Parsing (NLP)
1. User types free-form Vietnamese text in the expense input (e.g. "cafe 250k, anh A trả")
2. POST `/api/rooms/:roomId/ai/parse` → `aiController` → `parser.js`
3. If Gemini API key present and rate OK: Gemini 2.5 Flash parses → schema validate → sanitize → return
4. If not: local fallback regex parses Vietnamese amount shorthand and pronouns
5. Frontend populates expense form fields with parsed result
6. Operational event `ai.parser` logged

### Room Collaboration
1. Owner creates room → unique 6-char code generated
2. Members join via room code → `status: "pending"` membership created
3. Owner approves → `status: "approved"` → member can view/add expenses
4. Guest members can be added by any approved member; guests participate in expenses
5. Real user can claim a guest → merges past balances
6. Settlement: GET `/api/rooms/:roomId/payments/settlements` → `settlement.js` runs net-balance pathfinder → returns minimal bilateral payments

### Settlement Flow
1. User views Settlements tab for a room
2. Backend computes net balances per participant (users + claimed guests)
3. Settlement engine minimizes number of payments needed
4. User clicks "Settle" → PaymentModal opens → selects from/to/amount/date
5. POST `/api/rooms/:roomId/payments` → payment recorded
6. Balances recalculate on next request

### Import Flow (Excel)
1. User opens `ImportExcelModal` (accessible from room expenses page)
2. Uploads `.xlsx` file → POST `/api/rooms/:roomId/import/preview`
3. `excelImportParser.js` auto-detects header row, column types, member columns
4. `memberResolver.js` matches payer/participant source names to actual room members/guests
5. Preview returned with per-row status (valid/warning/skipped), diagnostics
6. `ImportPreviewTable` shows color-coded rows; `MemberMappingPanel` for manual name resolution
7. User reviews and confirms → POST `/api/rooms/:roomId/import/commit`
8. `importCommitService.js` runs transactional bulk insert
9. Operational events logged for admin observability

### Admin Flow
1. Admin user visits `/admin` → `AdminGuard` validates `user.role === "admin"`
2. `AdminWorkspace` loads overview tab by default
3. Admin can inspect any user or room via search → detailed modal with AI profile status, signals
4. Controlled mutations (suspend user, archive room, recompute AI profile) all write to `AuditTrail`
5. All admin actions emit `OperationalEvent` records
6. Audit tab shows immutable chronological log of all admin actions

---

## Security

### Authentication
- **JWT Sessions**: HS256 signed tokens; verified on every protected request via `requireAuth`
- **Password Storage**: BcryptJS with standard work factor
- **Password Reset**: High-entropy hex tokens; SHA-256 hashed before storage; single-use with expiry
- **Anti-Enumeration**: Forgot-password always returns generic success message regardless of email existence

### Authorization
- **Role System**: `member` (default) or `admin`; enforced in `adminMiddleware.js`
- **Room Isolation**: `roomMiddleware.js` verifies `status: "approved"` membership before granting room-scoped access
- **Suspended User Block**: `blockSuspended` middleware available for write-route protection; suspended users receive HTTP 403
- **Self-Protection**: Admin cannot suspend other admins; admin cannot change own role

### Room Isolation
- Every room-scoped route passes through room membership validation
- Cross-room data leakage prevented at middleware level — users in Room A cannot access Room B resources even via URL manipulation
- `security.room_access_denied` events logged when denial occurs

### Admin Isolation
- All `/api/admin/*` routes require both `requireAuth` and `requireAdmin`
- Admin actions require a valid active admin JWT — suspended admins cannot act
- All mutations write to immutable `AuditTrail` table

### Audit Trail
- `AuditTrail` model: immutable append-only log
- Covers: `user.suspend`, `user.reactivate`, `user.role_change`, `room.archive`, `room.reopen`, `ai.recompute`
- Admin Audit Tab surfaces this log in the UI with actor, action type, target, timestamp

### AI Privacy
- All data sent to Gemini passes through `profileSerializer.js`
- Stripped: emails, names, raw transaction lists, database identifiers, password hashes
- Passed as anonymous descriptive labels: "Spending Volatility: low", "Spending Style: balanced"
- `aiPrivacy.test.js` validates this serialization in the test suite

### Rate Limiting
- `generalLimiter`: 300 req / 15 min
- `authLimiter`: 20 req / 15 min (brute-force protection)
- `aiLimiter`: 20 req / 1 min (billing abuse prevention)
- Rate-limit hits logged as `security.rate_limit_hit` events

---

## Testing

### Test Suite (23 test files, Vitest)

| Test File | Area | Coverage Focus |
|---|---|---|
| `financeIntegrity.test.js` | Math | Zero-sum invariant, floating-point drift, null participant safety |
| `settlementEngine.test.js` | Math | Bilateral payment minimization, multi-party circular debt |
| `aiParser.test.js` | AI NLP | Vietnamese shorthand (1tr2, 500k, 1 củ), pronouns, fallback regex |
| `aiPrivacy.test.js` | AI Security | No emails/tokens/hashes in Gemini prompt context |
| `temporalSignals.test.js` | AI Temporal | Month-over-month, rolling trend, weekend patterns, budget adherence |
| `copilotEngine.test.js` | AI Copilot | Recommendation generation, deduplication, priority sorting |
| `guestClaim.test.js` | Security | Double-claim prevention, HTTP 409 on claimed guest |
| `roomIsolation.test.js` | Security | Cross-room access denial |
| `securityMutation.test.js` | Security | Unauthorized mutations rejected |
| `adminGuard.test.js` | Admin Security | Non-admin blocked from admin routes |
| `adminRouteAuth.test.js` | Admin Security | Unauthenticated admin route access denied |
| `adminMutations.test.js` | Admin | suspend/reactivate/role-change/archive/reopen correctness |
| `auditTrail.test.js` | Admin | Audit entries written on mutations |
| `importServices.test.js` | Import | Excel parser column detection, amount parsing, member resolution |
| `budgetEngine.test.js` | Budget | Budget comparison math, over-budget detection |
| `budgetAccess.test.js` | Authorization | Budget access scoping |
| `paymentLedger.test.js` | Payment | Payment recording correctness |
| `paymentAccess.test.js` | Authorization | Payment access scoping |
| `planAccess.test.js` | Authorization | Plan member access |
| `planConversion.test.js` | Plans | Plan expense → real expense conversion |
| `authLogin.test.js` | Auth | Login success/failure, JWT issue |
| `authAccess.test.js` | Auth | Protected route access without token |
| `productionHardening.test.js` | Hardening | Helmet headers, 429 rate-limit, 413 payload rejection |

**Critical Protected Flows with Test Coverage:**
- Financial zero-sum invariant
- Vietnamese NLP parser accuracy and fallback correctness
- AI privacy (no PII in Gemini prompts)
- Temporal intelligence signal calculation
- Guest claim security (double-claim → 409)
- Room isolation (cross-room → 403)
- Admin guard (non-admin → 403)
- Immutable audit trail writes
- Excel import column detection and amount parsing
- Plan-to-expense conversion
- Production hardening (helmet, rate limits, payload limits)

**Coverage Gaps:**
- No E2E / browser tests (Cypress/Playwright)
- No mobile viewport / gesture tests
- No full integration test covering the AI copilot pipeline end-to-end
- ForecastsPage and SettingsPage behavior not tested (stubs)

---

## Technical Debt

### Known Weaknesses

1. **SQLite Write Locks Under Concurrency**: SQLite is single-writer; concurrent POST requests can queue behind write locks. PM2 is configured as `fork` (single process) to mitigate, but the database layer itself is a fundamental limitation for any multi-user load. Strongly recommended: migrate to PostgreSQL before public launch.

2. **In-Memory Copilot Cache (No Eviction Hook)**: `copilotCache` in `copilotEngine.js` uses a 5-minute TTL Map. Adding a large expense does not invalidate the cache, so the copilot workspace may show stale recommendations for up to 5 minutes post-transaction.

3. **Budget Uniqueness at Application Level**: The `Budget` model lacks a `@@unique` constraint because nullable compound fields cause Prisma validation issues. Concurrent writes could theoretically create duplicate budget rows for the same user/room/category/month/year combination.

4. **ForecastsPage and SettingsPage Are Stubs**: `ForecastsPage` renders `AnalyticsDashboard` (functional, but not purpose-built for forecasts). `SettingsPage` is a placeholder card with no functionality.

5. **No Mobile Testing**: No Cypress or Playwright suite; no documented mobile breakpoint QA. The UI uses Tailwind responsive classes but mobile behavior is unverified.

6. **Fuzzy Title Matching for Recurring Patterns**: Recurring payment detection in both `analyticsService.js` and `temporalSignals.js` uses exact case-insensitive normalized string matching. "Tiền nước" vs "Tien Nuoc T5" would be treated as separate expense groups, lowering recurring detection confidence.

7. **PlanExpense Participants as JSON String**: `PlanExpense.participants` is stored as a JSON-encoded string rather than a normalized join table. Updating participants requires JSON parse/stringify cycles and is not referentially integrity-checked at the DB level.

8. **Missing DB Index on `Expense.date`**: Analytics and temporal signals heavily filter expenses by date range, but there is no index on `Expense.date` or `Expense.roomId + date`. This becomes significant as expense counts grow.

9. **Copilot Page Route Duplication**: Both `/insights` and `/copilot` render `AICopilotPage`. The navigation bar references one path; the other route exists as an alias. This could create confusion and does not help SEO or analytics clarity.

10. **No Pagination on Personal Analytics**: `analyticsService.js` loads all expenses across all user rooms in a single query. For users with extensive multi-year histories across many rooms, this becomes an O(N) full-table scan.

### Performance Concerns
- `buildPersonalFinanceSnapshot()` aggregates all memberships, expenses, payments in parallel — this is the heaviest DB operation in the system
- `buildTemporalSignals()` is a pure compute function (no DB) but processes all expenses in-memory (551 lines of statistics)
- `buildAdminOverview()` fires 10 parallel DB queries on every admin dashboard load with no caching
- `excelImportParser.js` holds the full file buffer in memory for parsing; no streaming for large files

### Architecture Concerns
- No Redis or distributed cache — all caching is in-process Map objects; server restart clears all caches
- Email delivery is a stub (`email.js`) — password reset emails are constructed but delivery mechanism needs SMTP/SES configuration to be operational
- No health metrics endpoint beyond the basic `/health` (uptime + timestamp); no Prometheus/Grafana integration

### UX Inconsistencies
- `SettingsPage` is a non-functional stub visible in navigation
- `ForecastsPage` is functional but labelled as a dedicated "Dự báo" page while actually rendering the same `AnalyticsDashboard` as the personal analytics component
- No toast/notification when a new room expense is added by another member (no real-time sync)
- Admin workspace error states not fully styled

---

## Production Readiness

### Deployment Stack
- **PM2**: `ecosystem.config.js` — process name `zyra-backend`, fork mode, autorestart, `max_memory_restart: '300M'`
- **Nginx**: Reverse proxy Port 80/443 → Port 5000, gzip compression, secure headers, Let's Encrypt SSL
- **Static Serving**: Vite builds to `/dist`; Express serves it with SPA catch-all
- **Environment**: `.env.example` documents required vars (JWT_SECRET, GEMINI_API_KEY, CLIENT_URL, NODE_ENV, PORT)
- **Health Check**: `GET /health` returns uptime, timestamp, environment

### Gaps Before Public Production

| Area | Status | Gap |
|---|---|---|
| Database | ⚠️ SQLite | Must migrate to PostgreSQL for multi-user concurrency |
| Email | ❌ Stub | SMTP/SES not wired; password reset emails not deliverable |
| Monitoring | ❌ None | No APM, no Prometheus, no alerting, no error tracking (Sentry) |
| Backups | ❌ None | No automated DB backup strategy documented |
| E2E Tests | ❌ None | No Cypress/Playwright suite |
| Settings Page | ❌ Stub | No user settings functionality (name change, password change, notification prefs) |
| Mobile UX | ⚠️ Untested | Responsive CSS present but not validated |
| Real-time | ❌ None | No WebSocket; balance updates require manual refresh |
| Rate Limiting | ✅ Configured | 3-tier limiters in place |
| Security Headers | ✅ Helmet | Configured |
| Payload Limits | ✅ 100KB | JSON body limit enforced |
| Auth System | ✅ JWT + bcrypt | Solid; anti-enumeration on forgot-password |
| Room Isolation | ✅ Middleware | Verified in tests |
| Admin System | ✅ Complete | Full RBAC + audit trail |
| Import Pipeline | ✅ Complete | With observability |

### Production Readiness Score: **62 / 100**

**Rationale:**
- **+35**: Core application logic is solid, mathematically correct, and security-tested. The codebase is well-structured with clear separation of concerns, comprehensive middleware, and a meaningful test suite covering 23 critical flows.
- **+12**: Admin workspace, audit trail, and operational events system provide the observability infrastructure needed to run the product safely.
- **+8**: AI systems have deterministic fallbacks; rate limiting prevents billing abuse; privacy masking before Gemini is tested.
- **+7**: PM2 + Nginx deployment stack is production-documented and operational.
- **-18**: SQLite is not production-appropriate for multi-user concurrency. This is a fundamental blocker.
- **-10**: No email delivery (password reset is broken in production), no monitoring/alerting, no automated backups.
- **-8**: No E2E test coverage; SettingsPage is a stub; ForecastsPage is functionally a relabeled analytics page; copilot cache has no eviction hook.
- **-7**: Missing DB indexes on high-frequency query patterns; no pagination on personal analytics; no real-time sync.
