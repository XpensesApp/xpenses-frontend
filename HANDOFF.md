# Handoff: Accounts, Subscriptions, and Credit Card Debt Model

Status as of commit `24e1594` ("Credit card logic refactor") on `master`. Working tree was clean at handoff time — everything described here is committed. This file documents a feature arc built across one extended session; delete or fold it into `CLAUDE.md` once its content is stable/obsolete.

## What was implemented

1. **Accounts** — a financial-account/payment-method concept (`debit` / `credit` / `cash` / `other`), full CRUD, one can be marked default.
2. **Entries linked to accounts** — expenses/income can optionally reference an account; untracked (no account) remains fully supported everywhere, by design.
3. **Subscriptions** — recurring-charge templates (fixed or variable amount, a billing day, optional end date, pause/resume). A store action (`syncDueEntries`) simulates "the backend" creating a `pending` entry once a subscription's billing day arrives; paying a pending entry turns it into a normal entry.
4. **Credit card debt model** (the core of this session) — purchases on a credit account create debt instead of an immediate cash outflow; debt is split into monthly installments; a separate `Payment` record reduces debt and debits a source account.
5. **Dashboard "Pagos de tarjeta pendientes"** — the next actionable card obligation is a first-class, always-visible dashboard section (not a dialog you have to trigger), with an inline "Pagar" action.

## Key architectural decision: facts vs. derived views

This is the one thing to internalize before touching this area. Only three things are persisted:

- **Purchase** (an `Expense` with `accountId` + a snapshotted `paymentDay`)
- **Payment** (`{ cardAccountId, amount, date, sourceAccountId? }`)
- **Account** (incl. credit cards)

Everything else — current debt, what's due now, upcoming obligations by month, how many installments remain on a purchase — is a **pure function** computed at read time from those facts. Nothing is cached or mutated to represent "how much of this purchase is paid." This was a deliberate, explicitly-discussed choice (see the plan file below) over the alternative of storing/mutating a `paidAmount` field, specifically to avoid a second source of truth that can drift.

Two consequences worth knowing:
- **`paymentDay` is snapshotted onto a Purchase at creation** (or when it's re-attached to a different account), never read live from the Account. Editing a card's payment day must never rewrite the schedule of past purchases — that invariant is enforced by never looking the account up again for classification.
- **Payments are never linked to a specific purchase.** Which purchase a payment "counts against" is recomputed every time via FIFO-by-due-date (oldest obligation first, across all purchases on that card — not purchase-by-purchase). Do not add a `purchaseId` to `Payment`; that would reintroduce stored attribution the model deliberately avoids.

"No prepayment" is enforced via an `isDue` flag: the dashboard always *shows* the next obligation (even next month's, as a preview), but the "Pagar" action only appears when `isDue` is true (its due date has actually arrived).

## Files/components now relevant

**Core logic — read this first for anything credit-card-related:**
- `features/expenses/balance.ts` — the single source of truth. `getCardLedger` (flattens every purchase's installment schedule for a card into one due-date-sorted queue, consumes it with that card's payments) is the primitive everything else wraps: `computeCardDebt`, `computeNextCardObligation`, `computeUpcomingObligations`, `countRemainingInstallments`, `computeBalances`, `computeAccountBalance`. A new "how much / when" question almost certainly belongs as a thin wrapper here, not a new calculation.
- `lib/dates.ts` — shared `clampDayToMonth` / `toISODate` / `periodKey`. Extracted mid-session after finding the credit-card schedule had a month-end rollover bug that the subscriptions feature had already solved correctly; both features import from here now.

**Types:**
- `features/expenses/expenses.types.ts` — `Expense` (a "Purchase" when `accountId` + `paymentDay` are set). No `paidAmount` field — removed this session.
- `features/accounts/accounts.types.ts`, `features/payments/payments.types.ts`, `features/subscriptions/subscriptions.types.ts`.

**Stores** (`store/*.store.ts`) — one per feature, plain CRUD except: `accounts.store.ts` has `setDefaultAccount`; `subscriptions.store.ts` has `toggleSubscriptionStatus` + `syncDueEntries`; `payments.store.ts` has no `update` (payments are immutable — delete-and-recreate is the correction path). `expenses.store.ts` is back to plain CRUD — the payment-mutation actions it had mid-session (`payBilledDebt`/`payFullDebt`) are gone.

**UI:**
- `app/dashboard/page.tsx` — balance tiles + `UpcomingCardPayments` + transaction list. No longer has the auto-popup payment reminder (see below).
- `features/accounts/components/UpcomingCardPayments.tsx` — new; the dashboard's first-class obligation list.
- `features/accounts/components/AccountCard.tsx` — per-account balance + next-obligation preview + pay button, all `isDue`-gated.
- `features/accounts/components/AccountPaymentDialog.tsx` — the one payment dialog (full/partial amount + source-account picker). Its `variant` prop was removed this session once the only remaining caller became "manual" (see below).
- `features/expenses/components/ExpenseDialog.tsx` — creates/edits entries; snapshots `paymentDay` only when the account selection actually changes; disables "Ingreso" when a credit account is selected (an income "purchase" on a card is really an undeclared refund, out of scope).
- `features/expenses/components/ExpenseCard.tsx`, `features/subscriptions/components/*` — display-layer consumers of the above.

## New conventions established

- **Sentinel values for "no selection"** in shadcn `Select` (`NO_ACCOUNT`/`NO_SOURCE = "none"`) since Radix `Select` rejects an empty-string value.
- **Reset dialog state via `key`-prop remount from the parent**, not `useEffect` + `setState` — the latter trips the React Compiler's "avoid setState in an effect" lint rule. Used for every payment dialog instance.
- **Verification via throwaway scripts**, not a test suite (none exists per `CLAUDE.md`). Pattern used repeatedly: write `scratch-verify-*.ts` at repo root importing the real modules, assert against hand-computed expected values with `npx tsx`, delete the script once green. Worth reusing for the next non-trivial change in this area — the Chrome extension for live browser verification was unavailable for roughly the back half of this session, so these scripts were the only real correctness check available.

## Known limitations / technical debt

- **No refund/reversal model.** Explicitly deferred by the user, not forgotten. If added later, the discussed shape is a third small fact (`{ reversalOf: purchaseId, amount }`) — folds into the same ledger-derivation approach.
- **No closing-date vs. due-date split, no interest/fees/minimum-payments/statements** — all explicitly out of scope by deliberate agreement, not oversights.
- **`Account` still allows a credit card with no `paymentDay` set** (the field is optional in `AccountDialog`). `ExpenseDialog` blocks *using* such a card for a purchase until one is set, but nothing stops *creating* it that way — a minor UX gap, not fixed this session.
- **Partial-period payment attribution tiebreak** (when a payment doesn't fully cover a period where two purchases both have something due) is decided by array/creation order — deterministic but not user-facing/configurable. Doesn't affect any totals, only which purchase's "X/Y cuotas" counter reflects the partial payment.
- **No automated browser verification** of this session's final UI (dashboard section, payment dialog's new source-account picker) — only `tsc`/`eslint`/logic-script checks and SSR smoke tests (curl 200s). A manual click-through is still owed.

## Pending work directly related to this feature

- Manual browser pass of the full flow: create a credit card → purchase with installments → dashboard shows the obligation → pay it (with a source account) → balances and the dashboard section update correctly.
- Refund/reversal model, whenever it's prioritized.
- Possibly require `paymentDay` at credit-account creation time (closes the gap noted above).
- No decision made on backend duplication: when a real backend arrives, whether it re-implements this derivation or exposes a computed-obligations endpoint is explicitly left open ("decide later" per the user).

## Before modifying this area

- Don't re-derive "is this a credit purchase" from the account's current `type` — only `Expense.paymentDay != null` is authoritative. Re-adding a live account lookup would reintroduce the exact historical-schedule-drift bug this session fixed.
- If you see `paidAmount` referenced anywhere, it's leftover from before this session's refactor and is a bug — it no longer exists on `Expense`.
- The user has been very deliberate and iterative about scope here (explicitly pushed back on over-modeling more than once). Before adding a new stored field or entity in this area, check whether it's derivable from Purchase + Payment + Account first, and if you think it isn't, say so and why rather than just building it.
- Full design rationale (why derive-vs-store, why FIFO-by-due-date, edge cases considered) lives in the approved plan at `C:\Users\jeanl\.claude\plans\vectorized-soaring-papert.md` if something here seems under-explained.
