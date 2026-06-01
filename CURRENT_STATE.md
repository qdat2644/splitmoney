# Zyra — Current State

> Generated: 2026-06-01  
> Status snapshot for sprint planning

---

## Product Status

### ✅ Completed

**Personal Finance**
- Personal Dashboard with cross-room balance, spending summary, net balance hero
- 12-month spending trend (monthly, by category, by room)
- Spending velocity (daily average, projected month-end)
- Top categories and top rooms aggregation
- Recurring expense detection (cadence: monthly/weekly/irregular, confidence score)
- Anomaly detection (monthly spike, category spike, room spike, large single expense, debt worsening)

**Budgets**
- User-scoped monthly budgets (per category or overall)
- Room-scoped monthly budgets
- Budget comparison against current-month spend
- Budget health status (healthy/risk/over) with over-budget count
- Budget at-risk forecast (projected overrun before month ends)

**Forecasting**
- Month-end total forecast (daily velocity × days remaining, blended with 3-month moving average)
- Category-level forecast
- Room-level forecast
- Forecast confidence score
- Risk category / risk room detection (projected to exceed budget)
- Debt trend direction (improving/stable/worsening)

**AI Copilot Workspace**
- Top 4 prioritized recommendations (severity × confidence ranked)
- Opportunity recommendations (secondary, deduplicated)
- Financial Memory panel (spending style, volatility, budget discipline, temporal trend)
- Temporal pills (active signals from temporal intelligence)
- Forecast snapshot card
- Planning intelligence card (active plan count, conversion progress)
- Room intelligence / group signals card
- Financial rhythm metrics (daily spend, days elapsed, at-risk budgets)
- 5-minute in-process cache per user

**AI Temporal Intelligence (TemporalSignals Engine)**
- Month-over-month comparison with delta % and confidence
- Rolling 7-day trend vs. prior 7 days
- Weekend vs. weekday spending ratio
- End-of-month spending concentration
- Recurring payment pattern detection (cadence, amount variance, confidence)
- Category momentum (MoM change per category)
- Volatility trend (stabilizing/more_variable/stable)
- Budget adherence trend
- Import behavior shift detection (pre/post-import baseline comparison)
- FinancialProfile persistence in database with `lastComputedAt`

**AI NLP Parser**
- Vietnamese natural language expense parsing via Gemini 2.5 Flash
- Deterministic regex fallback (Vietnamese amount shorthand, collective pronouns)
- Schema validation on Gemini output; fallback on schema violation
- Privacy masking via `profileSerializer.js`
- Operational event logging (`ai.parser`)

**AI Plan Generator**
- Trip/event parameter input form
- Gemini-powered itemized plan generation (costs, categories, risk warnings)
- AI Plan Board for review and editing before saving
- One-click save AI plan to Plans system

**AI Insight Generator**
- 5 Vietnamese actionable insights synthesized from analytics + forecast + anomalies
- Static fallback rules when Gemini unavailable

**Shared Rooms**
- Room creation (unique 6-char code) and join flow
- Membership approval lifecycle (pending → approved/rejected)
- Full expense CRUD (equal/exact/percentage splits, user/guest payer)
- Room dashboard with balance cards, recent transactions
- Settlement engine (net-balance pathfinder, minimal bilateral payments)
- Settlement recording (PaymentModal)
- Member management (approve/reject, balance view)
- Room analytics (category breakdown, spending trend)
- Guest member creation, claim, and security (double-claim prevention)

**Financial Plans**
- Plan CRUD (create/edit/delete) with type, status lifecycle, dates, description
- Plan expense CRUD (itemized estimates, split types)
- Plan participants (user/guest/manual, owner role)
- Participant sync cascade to unconverted plan expenses
- Plan-to-room expense conversion (ConvertExpenseModal with participant mapping)
- Estimated total auto-calculation

**Import/Export**
- Excel import pipeline: auto-detect header row, column classification, merged cell handling, secondary headers, summary row skipping, legacy footer skipping
- Member name resolution (fuzzy matching payer/participant names to room members/guests)
- Import preview with per-row status, warnings, diagnostics
- Import commit (transactional bulk insert)
- Admin import observability (OperationalEvent logging, Admin Imports Tab)
- CSV and JSON export for room data (expenses + payments)
- CSV and JSON export for personal data (expenses + budgets + plans)

**Admin Workspace**
- System-wide overview (metrics: users, rooms, expenses, AI activity, import activity, security signals)
- Admin Users Tab: paginated list, search/filter, per-user inspection modal, suspend/reactivate/role-change
- Admin Rooms Tab: paginated list, search/filter, per-room inspection modal, archive/reopen
- Admin AI Tab: AI observability (parser usage, fallback rate, temporal profile health), recompute profile trigger
- Admin Imports Tab: import observability (today's imports, failed, warning-heavy, unresolved mappings)
- Admin Security Tab: security signals (failed auth, denied mutations, rate limit hits, suspicious failures, guest claim conflicts)
- Admin Audit Log Tab: immutable chronological log of all admin actions
- Admin Trends: 14-day daily bucket charts (AI, imports, security, activity)
- Admin Narrative: auto-generated system status summary

**Security & Infrastructure**
- JWT authentication with auth failure event logging
- Helmet security headers
- 3-tier rate limiting (general, auth, AI)
- JSON payload size limit (100KB)
- Room access isolation middleware (room-scoped route protection)
- Admin role middleware
- Suspended user block middleware
- Anti-enumeration forgot-password response
- SHA-256 hashed password reset tokens
- AI privacy masking (no PII in Gemini prompts)
- PM2 process management (fork mode, 300MB restart limit, autorestart)
- Nginx reverse proxy with gzip and SSL
- Health check endpoint (`/health`)
- Structured request logging

**Testing (23 test files — Vitest)**
- Finance integrity, settlement math, AI NLP parser, AI privacy
- Temporal signals, copilot engine/recommendations
- Guest claim security, room isolation, security mutations
- Admin guard, admin route auth, admin mutations, audit trail
- Import services, budget engine, budget/payment/plan access
- Plan conversion, auth login/access, production hardening

---

### 🟢 Stable

The following areas are considered production-like in quality:
- Core expense split mathematics (zero-sum invariants)
- Settlement engine (optimized debt resolution)
- Room access isolation and security middleware
- Guest claim security (double-claim → 409)
- AI privacy masking
- Vietnamese NLP parser + fallback
- Admin workspace (observability + mutations + audit trail)
- Excel import pipeline
- Financial profile persistence and temporal signal computation
- Plan-to-room expense conversion
- Rate limiters and payload guards
- PM2 + Nginx deployment configuration

---

### 🔶 In Progress / Partial

- **ForecastsPage** — route exists and is functional but renders `AnalyticsDashboard` (not a purpose-built forecast page). A dedicated forecasting UI with interactive scenarios is still pending.
- **SettingsPage** — route exists; renders a placeholder card with no functionality. Name change, password change, notification preferences, and account deletion are not implemented.
- **Copilot Cache Eviction** — 5-minute TTL cache exists but has no hook to invalidate on new expense creation. Recommendations can lag by up to 5 minutes after transactions.
- **Email Delivery** — `email.js` exists and constructs reset email content; no SMTP/SES integration is wired. Password reset flow is incomplete in production.
- **Real-time Sync** — No WebSocket; balance and expense updates from other room members require a manual page refresh.
- **Mobile UX** — Tailwind responsive classes are used throughout, but no mobile viewport QA has been performed.

---

### ❌ Not Started

- **Settings functionality** (name change, password change, notification preferences, account deletion)
- **Dedicated ForecastsPage UI** (interactive monthly vs. category forecast visualization)
- **Push Notifications / Real-time** (WebSocket or Server-Sent Events for collaborative rooms)
- **Mobile App** (no React Native or PWA configuration)
- **PostgreSQL Migration** (currently on SQLite)
- **Monitoring & Alerting** (no Sentry, no Prometheus, no Grafana, no PagerDuty)
- **Automated DB Backups** (no cron-based backup strategy)
- **E2E Test Suite** (no Cypress or Playwright)
- **DB Indexes on High-Frequency Query Columns** (`Expense.date`, `Expense.roomId + date`)
- **Pagination on Personal Analytics** (full expense load on every analytics request)
- **Advanced Seasonality Models** (holiday cycles, payroll spikes in forecasting)
- **Fuzzy Title Matching** for recurring bill detection (current: exact normalized string match)

---

## Technical Debt

| Priority | Issue | Impact |
|---|---|---|
| 🔴 HIGH | SQLite for multi-user production | Write locks under concurrent access; must migrate to PostgreSQL |
| 🔴 HIGH | Email delivery not wired | Password reset broken in production |
| 🔴 HIGH | Missing `Expense.date` DB index | Full table scans on analytics/temporal signal computation |
| 🟠 MEDIUM | Copilot cache has no eviction hook | Stale recommendations up to 5 min after expense changes |
| 🟠 MEDIUM | Budget uniqueness at application level | Race condition can create duplicate budget rows |
| 🟠 MEDIUM | No pagination on personal analytics | Full expense history loaded per request; O(N) at scale |
| 🟠 MEDIUM | PlanExpense.participants as JSON string | No referential integrity; parse/stringify overhead |
| 🟡 LOW | ForecastsPage/SettingsPage are stubs | Navigation confusion; user-facing dead ends |
| 🟡 LOW | Copilot route alias (/insights + /copilot) | Analytics/navigation clarity |
| 🟡 LOW | Fuzzy title matching missing | Recurring detection misses near-duplicate titles |
| 🟡 LOW | No monitoring/alerting | Zero observability beyond admin operational events dashboard |

---

## Recommended Next Sprint

Ranked by **impact**:

### 1. 🔴 PostgreSQL Migration + DB Index Addition
**Impact**: Unlocks multi-user production deployment. Fixes the most fundamental architectural blocker. Adding indexes on `Expense.date` and `Expense.roomId` immediately improves analytics and temporal signal computation performance.

### 2. 🔴 Email Delivery Integration + SettingsPage
**Impact**: Makes password reset functional in production. SettingsPage enables users to change name/password independently, reducing admin support burden. Both are near-complete plumbing tasks.

### 3. 🟠 Copilot Cache Eviction + Personal Analytics Pagination
**Impact**: Ensures copilot recommendations reflect reality immediately after expense changes. Pagination prevents analytics from becoming a performance bottleneck as user data grows.

### 4. 🟠 E2E Test Suite (Playwright)
**Impact**: Validates the full user journey (register → create room → add expense → view copilot → import → settle). Catches regressions before production. Currently there is zero automated browser-level coverage.

### 5. 🟡 Dedicated ForecastsPage + Real ForecastsPage UI
**Impact**: Improves product coherence. Users navigating to `/forecasts` should see a purpose-built interactive forecasting interface, not a relabeled analytics dashboard. High value for product storytelling and demo quality.
