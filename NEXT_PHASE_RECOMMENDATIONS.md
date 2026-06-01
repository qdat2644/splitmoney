# Zyra — Next Phase Recommendations

> Generated: 2026-06-01  
> Author perspective: Lead Product Engineer  
> Audience: Engineering team, product stakeholders

---

## Recommendation

**Chosen Path: A — Productionization**

---

## Why Productionization?

Zyra is not a prototype. It is a fully functional, feature-rich application with:
- 23 test files covering financial math, security, AI privacy, and import parsing
- A complete admin workspace with audit trail and operational event observability
- A sophisticated temporal intelligence engine (551 lines of statistical signal computation)
- A working import pipeline that auto-detects headers, classifies columns, and handles real-world Excel formatting
- A functioning Gemini-powered copilot with deterministic fallbacks
- PM2 + Nginx deployment already documented

The product is **too good to not ship** — and too fragile to ship as-is.

The current state has two critical blockers that would cause a real-world multi-user deployment to fail:
1. **SQLite** — not suitable for concurrent writes from multiple users. Any scenario with 5+ simultaneous users writing expenses will produce write-lock queuing, timeouts, and data integrity risks.
2. **No email delivery** — the password reset flow is architecturally complete but physically non-functional in production because `email.js` has no SMTP/SES backend wired.

These are not feature gaps — they are infrastructure failures. They are also not expensive to fix. The codebase is clearly written to be database-agnostic (Prisma makes a PostgreSQL migration a configuration change + schema migration + a few query adjustments). Email is a single service integration.

Every other path — Performance, Mobile, AI Expansion, Real User Beta — is premature until the production infrastructure is sound. Running a real user beta on SQLite is a setup for a visible failure. Expanding AI features on top of an application that can't reliably deliver password resets is poor engineering prioritization.

---

## What Productionization Means for Zyra

### Phase A.1 — Database Migration (1–2 weeks)

**Target**: Migrate from SQLite to PostgreSQL (Neon, Supabase, Railway, or self-hosted)

**Steps**:
1. Update `prisma/schema.prisma` datasource: `provider = "postgresql"`, update `url`
2. Add missing DB indexes:
   ```prisma
   @@index([roomId, date])          // Expense
   @@index([createdByUserId])       // Expense
   @@index([paidByUserId])          // Expense
   @@index([userId, month, year])   // Budget
   ```
3. Add `@@unique` constraint to `Budget` (nullable compound fields work correctly in PostgreSQL)
4. Run `prisma migrate dev` to generate migration
5. Export existing SQLite data → import to PostgreSQL
6. Update PM2 exec_mode from `fork` to `cluster` (optional post-migration; safe for PostgreSQL)
7. Test all 23 test suites against PostgreSQL

**Risk**: Low. Prisma abstracts the database layer; most queries are standard. Minor risks around SQLite-specific behavior (e.g., JSON string comparisons) which the test suite will catch.

**Expected Impact**: Eliminates the #1 architectural blocker. Enables true multi-user concurrency. Unblocks real user beta. Enables future read replicas for analytics offloading.

---

### Phase A.2 — Email Delivery (2–3 days)

**Target**: Wire SMTP or Amazon SES into `backend/utils/email.js`

**Current state**: `email.js` constructs reset email content and has a function stub. Nothing sends.

**Steps**:
1. Choose provider: Resend (recommended for simplicity), SendGrid, or Amazon SES
2. Install SDK (e.g., `npm install resend`)
3. Update `email.js` to call the delivery API
4. Add `EMAIL_FROM` and `RESEND_API_KEY` (or equivalent) to `.env.example` and production env
5. Test the forgot-password → email → reset flow end-to-end

**Risk**: Minimal. The email content is already constructed. This is purely a delivery plumbing task.

**Expected Impact**: Password recovery becomes functional. Users are no longer permanently locked out if they forget their password. This is a user trust issue — a product that can't send password reset emails feels broken.

---

### Phase A.3 — Critical Performance Fixes (3–5 days)

Implement the identified quick wins from the Performance Audit:

1. **DB Indexes** on `Expense.roomId + date`, `Expense.createdByUserId`, `Expense.paidByUserId`
2. **File Size Limit** (5MB) on Excel import route
3. **Admin Overview Cache** (2-minute TTL)
4. **Copilot Cache Eviction** on expense write
5. **PersonalDashboard API Consolidation** (`/api/users/dashboard` single endpoint)
6. **Vite Bundle Splitting** (separate chunk for `xlsx`, `recharts`, `framer-motion`)
7. **Time-Window Bound** (24 months) on personal analytics snapshot

**Risk**: Very low. These are isolated, targeted changes with clear scoping.

**Expected Impact**: 
- Analytics pages load 2–5× faster under normal usage
- Import route safe against memory exhaustion
- Admin dashboard no longer hammers DB on every tab switch
- Copilot recommendations always reflect current state
- Initial page load bundle is smaller

---

### Phase A.4 — Monitoring & Error Tracking (2–3 days)

**Target**: At minimum, Sentry integration + log aggregation

**Steps**:
1. Install `@sentry/node` and `@sentry/react`
2. Wire Sentry DSN in backend `app.js` error handler and frontend `main.jsx`
3. Configure environment (production vs. development)
4. Optionally add PM2 `--log` output to a log aggregator (Logtail, Papertrail, or self-hosted Loki)

**Risk**: None. Additive only.

**Expected Impact**: First visibility into production errors beyond the admin operational events dashboard. Sentry will catch unhandled exceptions, slow API calls, and frontend JS errors with full stack traces. Essential for operating the product with real users.

---

### Phase A.5 — Settings Page (3–5 days)

**Target**: Implement the SettingsPage stub

**Minimum viable features**:
- Display name change (POST `/api/users/profile`)
- Password change (POST `/api/users/change-password`)
- Account deletion (DELETE `/api/users/me` with confirmation)

**Current state**: Page is a placeholder card. Route exists. Navigation link exists.

**Risk**: Low. Auth patterns (JWT, bcrypt) already exist for these operations.

**Expected Impact**: Removes the most visible user-facing stub. Users can manage their own account without admin intervention.

---

### Phase A.6 — ForecastsPage Dedicated UI (3–5 days)

**Target**: Build a purpose-built forecasting UI at `/forecasts` instead of reusing AnalyticsDashboard

**Features**:
- Month-end total forecast with visual progress bar (spent / projected / budget)
- Category-level forecast table (current pace vs. budget limit)
- Room-level forecast table
- Confidence indicator
- "What if" scenarios (optional stretch: add/reduce daily spend, see impact)

**Risk**: Low. Data already exists from `buildForecast()` in `analyticsService.js`.

**Expected Impact**: Product coherence. Users who navigate to "Dự báo" see a purpose-built tool, not a mislabeled analytics dashboard. High value for the demo story and for user trust.

---

## Expected Impact (Full Productionization Sprint)

| Metric | Before | After |
|---|---|---|
| Multi-user write concurrency | ❌ Blocked by SQLite | ✅ PostgreSQL |
| Password reset | ❌ Broken in production | ✅ Functional |
| Admin dashboard DB load | 10 queries/visit | 1 query per 2 min |
| Analytics load time (large history) | Potentially 5–15s | 1–3s with indexes |
| Copilot freshness after expense | Up to 5 min stale | Immediate |
| Import memory safety | Unbounded | Capped at 5MB |
| Error observability | Admin events dashboard only | Sentry + structured logs |
| Settings page | ❌ Stub | ✅ Name/password/delete |
| ForecastsPage | ❌ Relabeled analytics | ✅ Dedicated forecast UI |
| Production Readiness Score | 62/100 | ~82/100 |

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| PostgreSQL migration breaks a query | Medium | Vitest suite runs against new DB; fix before deploy |
| Budget @@unique constraint reveals existing duplicate rows | Low | Run dedup query before enabling constraint |
| Email provider rate limits or spam filters | Low | Use reputable provider (Resend/SendGrid); warm up domain |
| Sentry capturing PII in error context | Medium | Configure `beforeSend` hook to strip email/name fields |
| Settings page UX mismatch with rest of app | Low | Follow existing AppInput/AppCard/ModalLayout component patterns |

---

## Estimated Effort

| Phase | Effort | Who |
|---|---|---|
| A.1 — PostgreSQL Migration | 1–2 weeks | Backend/DevOps |
| A.2 — Email Delivery | 2–3 days | Backend |
| A.3 — Performance Fixes | 3–5 days | Fullstack |
| A.4 — Monitoring | 2–3 days | Fullstack/DevOps |
| A.5 — Settings Page | 3–5 days | Fullstack |
| A.6 — ForecastsPage UI | 3–5 days | Frontend |
| **Total** | **~5–7 weeks** | 1–2 engineers |

---

## Why Not the Other Paths?

### B — Performance
The performance issues identified are real but not blocking. The system performs acceptably for early-stage user counts. Most performance problems are directly tied to SQLite (the write-lock, the sequential scan problem). Optimizing without migrating the database fixes 40% of the performance problems at best. Do performance work *after* PostgreSQL migration, when the real bottlenecks become visible under actual load.

### C — Mobile Experience
Zyra's web UI uses Tailwind responsive classes and is likely usable on mobile, but it has never been tested. Building a dedicated mobile experience before the production infrastructure is solid would be building on an unstable foundation. Mobile is the right next step *after* productionization, not before.

### D — AI Expansion
The AI system is already sophisticated: temporal intelligence, three Gemini workflows, deterministic fallbacks, privacy masking, 5-minute cache, recommendation deduplication. Adding more AI features before the core product is production-ready would increase complexity without delivering user value. AI expansion is the right move in Sprint 3 or 4, once there are real users generating real data to learn from.

### E — Real User Beta
A real user beta on SQLite with broken password reset, no error monitoring, and a stub settings page is not a beta — it is a ticking clock until a visible failure. The productionization sprint described above is the prerequisite for a successful beta. Run the beta in Sprint 2, not Sprint 1.

---

## Summary Recommendation

**Do productionization first. Then run a closed beta. Then expand.**

The architecture is sound. The feature set is impressive. The test coverage is meaningful. The team has clearly built something worth shipping. The remaining gap is not features — it is infrastructure maturity. Close that gap in one focused sprint and Zyra will be ready for real users.
