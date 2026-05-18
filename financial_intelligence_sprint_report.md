# Financial Intelligence Sprint Report

## Files Created / Changed

Created:
- `backend/services/personalFinanceSnapshotService.js`
- `backend/services/analyticsService.js`
- `backend/controllers/analyticsController.js`
- `backend/routes/analyticsRoutes.js`
- `src/hooks/useDashboardAnalytics.js`
- `src/components/personal/AnalyticsDashboard.jsx`

Changed:
- `backend/server.js`
- `backend/services/personalSummaryService.js`
- `backend/services/personalInsightService.js`
- `backend/services/budgetService.js`
- `backend/services/ai/insightGenerator.js`
- `backend/utils/insightRules.js`
- `src/services/apiClient.js`
- `src/pages/PersonalDashboard.jsx`

## Analytics Architecture

- `buildPersonalFinanceSnapshot()` is the shared user-scoped data loader.
- It only reads approved room memberships, merges claimed guest identity into the current user, and loads expenses plus payment-ledger entries once for downstream consumers.
- `buildPersonalSummary()` and `buildPersonalAnalytics()` both consume that snapshot, so the AI pipeline does not repeat the same DB work.
- `/api/users/me/analytics` is authenticated and returns backend-computed trends, top lists, velocity, budget health, debt health, forecast, recurring candidates, and anomalies.
- Budget comparison logic was extracted into `buildBudgetComparisonFromData()` so analytics and the existing budget service share the same calculation path.

## Forecasting

- Current-month forecast uses month-to-date extrapolation.
- It is tempered with the recent completed-month moving average when month-to-date data is sparse.
- Forecast output includes:
  - month total
  - category forecast
  - room forecast
  - category / room budget risks
  - debt trend direction
  - bounded confidence and explicit assumptions
- Confidence is intentionally conservative and never presents the forecast as certainty.

## Recurring Detection

- Deterministic grouping by normalized title plus category.
- Requires at least three repeated observations.
- Frequency is inferred from average gap:
  - roughly weekly
  - roughly monthly
  - otherwise irregular
- Confidence combines cadence regularity with amount stability.
- No recurring item is auto-created.

## Anomaly Engine

- Category spikes: current month materially above prior-month average.
- Room spikes: same comparison at room level.
- Large expenses: unusually large current-month participant share versus current-month norm.
- Debt spikes: worsening debt-health trend from canonical balance calculations.
- Results stay bounded to `info` or `warning` severity and include confidence.

## AI Upgrade

- AI input changed from `summary` only to `summary + analytics + forecast`.
- The Gemini prompt now uses privacy-reduced aggregates:
  - anonymized room labels
  - no raw room names in prompt
  - no transaction titles in prompt
  - no identifying user data
- Structured validation still caps output at five insights and requires confidence.
- Deterministic fallback now also uses forecast risks and anomaly output.
- A five-minute in-memory cache reduces repeated Gemini calls for the same user.

## QA Results

Verified:
1. `node --check` passed for the new backend service, controller, route, AI generator, and rules files.
2. `npm.cmd run build` passed.
3. Existing seeded user smoke test succeeded:
   - analytics returned 12 monthly points
   - forecast returned bounded confidence
4. No-data user smoke test succeeded:
   - zero rooms
   - zero expenses
   - empty trends
   - zero forecast
5. AI fallback smoke test succeeded:
   - Gemini failure fell back to deterministic rules
   - valid insight payload returned

Not fully fixture-tested in this repo state:
1. Claimed guest merge, because the current database has `0` claimed guests.
2. High-spender / heavy-debt / recurring / spike scenarios, because there is no seeded scenario harness yet.
3. Mobile browser rendering, because no automated viewport test harness is currently configured.

## Remaining Technical Debt

1. Analytics currently compute over historical rows at request time. A future phase should add rollups or cached aggregates for large datasets.
2. Forecasting is deterministic but still intentionally simple; there is no seasonality model or holiday adjustment.
3. Recurring detection is title-sensitive and does not yet use fuzzy matching or merchant aliases.
4. There is no automated fixture suite for the scenario matrix requested in QA.
5. The Vite build still reports the pre-existing circular vendor chunk warning.
6. Insight caching is in-memory only and is not invalidated on finance mutations yet.

## Recommended Next Phase

Build a finance test harness before adding more intelligence:
1. deterministic fixtures for debt, recurrence, category spike, room spike, and claimed-guest scenarios
2. endpoint tests for `/api/users/me/analytics`
3. UI viewport tests for the Personal Dashboard analytics section
4. cache invalidation hooks after mutations
5. optional persisted monthly rollups once dataset size justifies it
