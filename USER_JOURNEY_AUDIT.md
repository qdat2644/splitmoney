# Zyra User Journey Audit

Scope: first-time user journey audit only. This document does not review UI styling, colors, spacing, or visual polish.

Date: 2026-06-03

## Executive Summary

Zyra has the core product loops in place: users can create rooms, add expenses, compute settlements, create budgets, and build plans. The largest journey risks are not missing backend capability; they are missing guidance at decision points, weak handoffs between steps, and unclear invite/member onboarding.

Highest-impact issue: the product is still room-first in practice, while the homepage now promises a broader personal finance workspace. A solo first-time user can land on the dashboard, but most meaningful actions still route them toward creating or joining a room.

## Impact Ranking

| Rank | Journey | Severity | User Impact |
|---|---|---|---|
| 1 | Invite member flow | High | Users can create a room but may not know how to bring real people in or what pending approval means. |
| 2 | Solo-user flow | High | A first-time solo user has limited meaningful progress without creating a room. |
| 3 | Add expense flow | High | The core ledger action works, but split modes and AI parsing have decision points that can confuse first-time users. |
| 4 | Settlement flow | Medium-High | The math works, but users may not understand when to record payment, what happens after payment, or whether money moved outside Zyra. |
| 5 | Plan flow | Medium | Powerful, but the path from plan to real expense is not obvious enough for a new user. |
| 6 | Budget flow | Medium | Functional, but scope, month selection, and relationship to actual spend need more guidance. |
| 7 | Create room flow | Medium | Happy path works, but next-step guidance after creation is thin. |

---

## 1. Invite Member Flow

Severity: High

### Expected Behavior

A first-time room owner expects to:

- Create a room.
- Invite another person through a clear action.
- Share either a link or room code.
- Understand that the invited person must register/login and request to join.
- Approve or reject pending requests.
- Know how guest members differ from real members.

### Actual Behavior

- Room creation produces a room card with a room code.
- The Members page can show the room code in an empty state.
- Joining is done from `/rooms` by entering a 6-character code.
- Owners approve pending members from the Members page.
- Owners can add guest members through "Thêm người ảo".
- There is no dedicated "Invite" action, copyable invite link, or clear handoff after room creation.

### Friction Points

- The room code is visible, but the product does not strongly tell the owner to copy/share it.
- A new owner must infer that inviting means "tell someone this code manually".
- A joining user must know to go to `/rooms`, not the room itself.
- Pending requests only become visible to owners inside the room Members page; there is no obvious global alert after someone requests access.
- Guest member creation lives near member management, but its relationship to inviting real members is easy to misunderstand.

### Confusion Points

- "Thành viên ảo" may look like an invite path, but it creates a placeholder ledger identity, not an account invitation.
- A user who joins with a code and sees "pending" may not know who must approve them or where approval happens.
- Claiming a guest identity during join is a powerful feature, but the user gets little explanation of consequences.

### Dead Ends

- No share link, copy button, or "send invite" flow.
- A pending member cannot meaningfully proceed into the room.
- A non-owner may not understand why they cannot approve members.

### Missing Guidance

- "Share this code with members" immediately after room creation.
- "New members request access; room owner approves them in Members."
- "Use guest members only for people who do not have an account yet."
- "If you are claiming a guest identity, past balances will attach to your account."

---

## 2. Solo-User Flow

Severity: High

### Expected Behavior

A first-time solo user expects to:

- Understand whether Zyra supports personal finance without a group.
- Add personal expenses or import data.
- Create a personal budget.
- See analytics/forecast/copy guidance after adding data.
- Avoid being forced into a room if they only want personal tracking.

### Actual Behavior

- The personal dashboard has an empty state that asks the user to create or join a room.
- Budgets can be personal or room-scoped.
- Analytics, forecasts, and Copilot depend on available financial data.
- Expense creation is room-scoped.
- There is no obvious standalone personal expense entry path outside rooms.

### Friction Points

- The dashboard presents personal finance value, but the first action routes to rooms.
- A user who wants to track only personal spending may not know where to enter their own expenses.
- Personal budgets can be created before any personal expense source exists, which can feel abstract.
- Forecasts and Copilot may appear sparse or generic until room data exists.

### Confusion Points

- "Tổng quan" sounds personal, but core transaction entry still happens inside rooms.
- "Ngân sách cá nhân" exists, but actual personal spend input is not clearly available.
- Legacy local offline data exists as a side path, but it is not a normal onboarding path.

### Dead Ends

- A solo user without rooms can create budgets but cannot complete the full track-spend-review loop from a clearly personal flow.
- The dashboard empty state effectively funnels users into group setup.

### Missing Guidance

- Explain that Zyra currently builds personal analytics from room expenses and budgets.
- Offer a clear "Start solo tracking" path if solo support is intended.
- If solo support is not intended yet, say "Create a private room for yourself" and explain why.

---

## 3. Add Expense Flow

Severity: High

### Expected Behavior

A first-time user expects to:

- Enter a room.
- Add an expense quickly.
- Choose payer and participants.
- Understand how equal, exact, and percentage split modes work.
- Save and immediately see balances update.
- Recover from invalid split input.

### Actual Behavior

- Add expense is available from room top bar, room dashboard, and expenses page.
- The modal defaults payer to current user and participants to all members.
- Users can use AI text parsing or manual entry.
- Equal, exact, and percentage split modes are available.
- Duplicate detection pauses submission and requires a second confirmation click.
- After save, expenses update and settlement calculations refresh.

### Friction Points

- AI entry appears before manual fields, so first-time users may think AI is the primary way to add expenses.
- Split mode labels are present, but the user may not know when to use exact vs percentage.
- Exact and percentage modes show validation status, but the final save still depends on backend validation; first-time users may not understand what must match.
- Duplicate detection changes the submit action after the first click; helpful but surprising without prior explanation.
- Guest vs real member payer selection can feel similar, even though the underlying identity impact differs.

### Confusion Points

- If AI cannot identify payer, the user gets a field error but may not know which part of the free text failed.
- In exact split, users may expect entering one person's amount to auto-fill the remaining amount.
- In percentage split, users may expect a "split evenly" helper.
- After saving, the user may not know whether the expense affected settlements, budgets, forecasts, or Copilot immediately.

### Dead Ends

- Local offline room blocks adding expenses with a toast; there is no guided migration path.
- If a room has only one member, adding expenses technically works but settlement value is limited.

### Missing Guidance

- "Manual entry always works; AI is optional."
- "Equal split is best for most shared bills."
- "Exact and percentage splits must add up to the total."
- "After saving, balances and settlements update automatically."

---

## 4. Settlement Flow

Severity: Medium-High

### Expected Behavior

A first-time user expects to:

- See who owes whom.
- Record a real-world payment.
- Understand that Zyra does not move money.
- See balances update after recording payment.
- Undo or delete a mistaken payment.

### Actual Behavior

- Settlements page shows optimized settlement suggestions.
- Users can record payment manually or from a suggested settlement.
- Payment history is shown and payments can be deleted.
- Balances update locally after payment creation/deletion.
- The page explains the optimization algorithm in technical terms.

### Friction Points

- The distinction between "suggested settlement" and "actual payment recorded" needs stronger guidance.
- The algorithm explanation may not answer the user's practical question: "What should I do now?"
- Manual payment lets users choose payer/receiver and amount, but users may not know whether partial payment is okay until after entering an amount.
- Quick pay from negative balance pre-fills from/amount but may not prefill the receiver, requiring extra thinking.

### Confusion Points

- Users may assume Zyra transfers money, while it only records settlement.
- "Trả tiền" could mean "pay now" or "mark as paid."
- Optimized settlement count can be confusing when several original expenses produced fewer suggested transfers.

### Dead Ends

- If there are no settlements, users see balanced state but no explanation of what created that state.
- If a debtor uses quick pay without a receiver prefilled, they may stop in the modal.

### Missing Guidance

- "Zyra only records payments; transfer money outside the app."
- "Recording a payment reduces the balance immediately."
- "You can record partial payments."
- "Suggested settlements minimize the number of transfers."

---

## 5. Plan Flow

Severity: Medium

### Expected Behavior

A first-time user expects to:

- Create a trip/event/moving/etc. plan.
- Add participants.
- Add estimated expenses.
- Review total and per-person expectations.
- Convert planned expenses into real room expenses when they happen.

### Actual Behavior

- Users can create plans manually or generate with AI.
- Plans can contain participants and planned expense items.
- Plan items can be expanded, edited, deleted, and converted into real room expenses.
- Conversion requires selecting a room, payer, date, and mapping manual participants to room members when needed.
- AI-generated plans can be reviewed and saved as normal plans.

### Friction Points

- Primary split between "Tạo bằng AI" and "Tạo kế hoạch" is understandable, but first-time users may not know what happens after AI generation.
- Plan participants can be manual, room members, or guests; the implications are not fully explained.
- Conversion is powerful but multi-step, and appears only after users expand a plan item.
- If the user has no rooms, conversion cannot complete, but this dependency is discovered late.

### Confusion Points

- A plan is not a real expense until converted, but users may assume estimates affect balances.
- "Converted" state is clear after conversion, but the before state may not explain that balances are unaffected.
- Manual participants need mapping later; users may not understand why.

### Dead Ends

- Users can create plans without rooms, but cannot complete the plan-to-ledger loop until a room exists.
- Conversion can stop at "Bạn chưa có phòng nào" with no direct create-room action.

### Missing Guidance

- "Plans are estimates; they do not affect balances until converted."
- "Create or choose a room before converting plan items."
- "Manual participants must be matched to room members during conversion."
- After saving an AI plan, offer next step: add item, convert item, or open rooms.

---

## 6. Budget Flow

Severity: Medium

### Expected Behavior

A first-time user expects to:

- Create a monthly budget.
- Choose personal or room scope.
- Choose category and amount.
- See current spend compared to the limit.
- Understand what happens next when budget is exceeded.

### Actual Behavior

- Budget page lists budgets and current status.
- Users can create personal or room-scoped budgets.
- Budget status compares current-month spend against limits.
- AI budget suggestions are collapsed by default and optional.
- Budgets can be edited or deleted.

### Friction Points

- Scope choice is functional but lacks explanation: personal budget vs room budget.
- Month/year selection defaults to current month, but first-time users may not know budgets are monthly snapshots.
- Users can create a personal budget without obvious personal expense entry.
- Room-scoped budgets depend on room expense data, but that relationship is implicit.

### Confusion Points

- "Overall" vs category budget may not be clear.
- Users may expect budgets to prevent expenses, while Zyra only tracks and warns.
- If there is no spending yet, a budget can look inert.

### Dead Ends

- No direct link from an empty budget state to adding the expenses that will drive budget status.
- If a user has no rooms but chooses room scope, they must understand why there are no rooms to select.

### Missing Guidance

- "Budgets track spending; they do not block new expenses."
- "Personal budgets use your cross-room spending."
- "Room budgets only count expenses from that room."
- "Start with Overall if you are not sure which category to choose."

---

## 7. Create Room Flow

Severity: Medium

### Expected Behavior

A first-time user expects to:

- Open Rooms.
- Create a room with a name.
- Land somewhere useful after creation.
- Know how to add members and add first expense.

### Actual Behavior

- User enters a room name and creates the room.
- The room appears in the list.
- User must click the room card to enter.
- Once inside, dashboard and top bar expose add expense.
- Members page contains room code and member management.

### Friction Points

- After creation, the user remains on the list instead of being guided into the new room.
- Next action is not explicit: invite people, add guest, or add first expense.
- The room code is visible but not treated as the core onboarding artifact.

### Confusion Points

- "Room" can mean group, household, trip, or project; first-time users may not know the intended shape.
- Users may create a room when they actually wanted personal tracking.

### Dead Ends

- If room creation succeeds but the user misses the new card, they may not know the next step.
- If room loading fails, error handling is mostly toast-level and not a durable recovery state.

### Missing Guidance

- Post-create next step: "Open room", "Share code", "Add first expense."
- Explain common room examples.
- Explain that a private one-person room can be used for solo tracking if that is the intended workaround.

---

## Cross-Journey Recommendations

1. Add post-action guidance after room creation.
   - Show the room code and next actions: share code, open room, add first expense.

2. Create a dedicated invite affordance.
   - At minimum: copy room code, explain join/approval flow.
   - Better: invite link that lands on join flow with code prefilled.

3. Clarify solo-user positioning.
   - Either support true personal expense entry or explicitly recommend creating a private room.

4. Add "what this affects" guidance for core financial actions.
   - Expense affects balances, settlements, budgets, forecasts.
   - Payment affects balances and settlement history.
   - Plan estimate does not affect balances until converted.
   - Budget tracks and warns; it does not block spending.

5. Strengthen pending-member lifecycle messaging.
   - Joiner should know they are waiting for owner approval.
   - Owner should have a visible pending-request signal outside the Members page.

6. Add recovery links in dead ends.
   - No rooms during plan conversion: link to create room.
   - Local offline room: link to create real room.
   - Empty budget with no data: link to add expense.

## Final Verdict

Zyra's core mechanics are present, and the happy paths are already covered by smoke E2E for login, room creation, expense creation, forecasts, settings, and admin access. The main first-time user risk is orientation: users need clearer explanations of what each object means, what the next step is, and which actions update real balances versus estimates or advisory views.
