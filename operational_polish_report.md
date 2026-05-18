# Operational Polish Sprint Report

## Files Changed

- `src/main.jsx`
- `src/App.jsx`
- `src/components/layout/Layout.jsx`
- `src/components/ui/Toast.jsx`
- `src/components/ui/ConfirmDialog.jsx`
- `src/components/ui/ExportButton.jsx`
- `src/components/ui/ChangePasswordModal.jsx`
- `src/hooks/useToast.jsx`
- `src/hooks/useConfirm.jsx`
- `src/hooks/useRoomMembers.js`
- `src/hooks/usePlans.js`
- `src/components/expenses/PlanExpenseModal.jsx`
- `src/components/expenses/ConvertExpenseModal.jsx`
- `src/pages/PlansPage.jsx`
- `src/components/budget/BudgetModal.jsx`
- `src/components/budget/BudgetList.jsx`
- `src/pages/BudgetPage.jsx`
- `src/components/members/MemberCard.jsx`
- `src/pages/Settlements.jsx`
- `src/services/apiClient.js`
- `backend/routes/planRoutes.js`
- `backend/controllers/planController.js`
- `backend/services/planningService.js`
- `backend/services/budgetService.js`

## Features Completed

1. Added a reusable global toast system with `success`, `error`, `warning`, and `info` variants.
2. Added a reusable promise-based confirm dialog system.
3. Replaced browser confirms in destructive main flows:
   - budget delete
   - plan delete
   - plan expense delete
   - payment delete
   - guest/member delete
4. Added lazy `useRoomMembers(roomId)` with loading, error, and simple per-room cache support.
5. Switched `ConvertExpenseModal` to fetch room members lazily and submit backend-authoritative payer fields.
6. Added plan expense edit support:
   - `PATCH /api/plans/expenses/:planExpenseId`
   - converted plan expenses cannot be edited
   - validation for amount, category, split type, and participants
   - modal reuse for create/edit
   - local plan state updates after save
7. Added room-scoped budget UI:
   - personal vs room scope selector
   - room selector for room scope
   - scope badge and room name in budget list
8. Added success/error toast coverage to export and password-change flows.

## Bugs Fixed

1. Room-scoped budgets now compare against spending from the selected room instead of all rooms.
2. Editing an existing budget now updates by budget ID instead of creating a duplicate row when scope/category/month changes.
3. Planned expense conversion now sends `paidByUserId` or `paidByGuestMemberId` instead of a frontend-only `paidBy` field.
4. Plan expense state now refreshes totals correctly after edits.
5. Guest deletion now uses the same reusable destructive confirmation flow as the rest of the app.

## Manual Test Checklist

1. Create a personal budget and confirm a success toast appears.
2. Create a room budget, select a room, and verify the list shows `Phòng` plus the room name.
3. Edit a budget's amount and confirm the existing row updates without duplicating.
4. Delete a budget and verify the confirm dialog, success toast, and row removal.
5. Create a plan expense, edit it, and verify amount/title changes update immediately.
6. Attempt to edit a converted plan expense and confirm the backend rejects it.
7. Delete a plan expense and a plan through the confirm dialog flow.
8. Open plan expense conversion, select a room, verify member loading state, and complete conversion.
9. Delete a payment and confirm the reusable dialog is shown before removal.
10. Delete a guest/member and confirm the reusable dialog is shown before removal.
11. Export room and personal data and verify success/error toasts behave correctly.
12. Change password and verify loading state plus success/error toast behavior.

## Remaining Technical Debt

1. Plan expense participant editing is still intentionally basic. Exact and percentage split modes use evenly generated shares rather than a dedicated per-participant editor.
2. Backend user-facing error strings are still mixed between older localized text and newer ASCII-safe additions.
3. There are no automated tests covering the new confirm provider, room-member hook cache, or plan expense patch route yet.
4. The production build still reports the pre-existing circular vendor chunk warning from the Vite chunk configuration.
