import { Expense } from "./expenses.types";
import { Account } from "@/features/accounts/accounts.types";

function signedAmount(expense: Expense) {
  return expense.type === "income" ? expense.amount : -expense.amount;
}

export type InstallmentInfo = {
  index: number;
  total: number;
  dueDate: Date;
  amount: number;
};

/**
 * Splits a credit purchase into its monthly installments ("cuotas"). Each
 * installment is billed on the account's payment day: the first one on the
 * next payment day on/after the purchase date, then one per following month.
 */
export function getInstallmentSchedule(
  expense: Expense,
  paymentDay: number
): InstallmentInfo[] {
  const total = Math.max(1, expense.installments ?? 1);
  const purchaseDate = new Date(expense.date);
  const firstMonthOffset = purchaseDate.getDate() <= paymentDay ? 0 : 1;
  const baseAmount = Math.round(expense.amount / total);

  const schedule: InstallmentInfo[] = [];
  let allocated = 0;

  for (let i = 0; i < total; i++) {
    const isLast = i === total - 1;
    const amount = isLast ? expense.amount - allocated : baseAmount;
    allocated += amount;

    schedule.push({
      index: i + 1,
      total,
      dueDate: new Date(
        purchaseDate.getFullYear(),
        purchaseDate.getMonth() + firstMonthOffset + i,
        paymentDay
      ),
      amount,
    });
  }

  return schedule;
}

/** Total amount already billed (installments due on or before `asOf`). */
function billedAmount(expense: Expense, paymentDay: number, asOf: Date): number {
  return getInstallmentSchedule(expense, paymentDay)
    .filter(installment => installment.dueDate <= asOf)
    .reduce((sum, installment) => sum + installment.amount, 0);
}

/** How many installments of a credit purchase have been fully paid off so far. */
export function countPaidInstallments(expense: Expense, paymentDay: number): number {
  let remaining = expense.paidAmount;
  let count = 0;

  for (const installment of getInstallmentSchedule(expense, paymentDay)) {
    if (remaining + 0.5 < installment.amount) break;
    remaining -= installment.amount;
    count++;
  }

  return count;
}

/** Total remaining balance owed on a single entry (all installments, billed or not). */
function entryRemainingDebt(expense: Expense): number {
  return expense.type === "income" ? -expense.amount : expense.amount - expense.paidAmount;
}

/** Amount currently billed and still unpaid for a single entry (only past/current-cycle installments). */
export function computeEntryDueNow(expense: Expense, paymentDay: number, asOf: Date): number {
  if (expense.type === "income") return -expense.amount;
  return Math.max(0, billedAmount(expense, paymentDay, asOf) - expense.paidAmount);
}

/** Amount that can still be paid off a single purchase, across all its installments (billed or not). Income entries aren't payable. */
export function computeEntryRemaining(expense: Expense): number {
  if (expense.type !== "expense") return 0;
  return Math.max(0, expense.amount - expense.paidAmount);
}

/**
 * Applies a payment amount across a set of entries, oldest purchase first,
 * capping how much each entry can absorb via `capFor`. Used to record a
 * single payment made against an account's overall debt — not against any
 * one entry directly — while still knowing how to attribute it internally.
 */
export function distributePayment(
  entries: Expense[],
  amount: number,
  capFor: (expense: Expense) => number
): Expense[] {
  const eligible = entries
    .map(expense => ({ expense, cap: capFor(expense) }))
    .filter(({ cap }) => cap > 0)
    .sort((a, b) => a.expense.date.localeCompare(b.expense.date));

  let remaining = amount;
  const updates: Expense[] = [];

  for (const { expense, cap } of eligible) {
    if (remaining <= 0) break;
    const applied = Math.min(remaining, cap);
    remaining -= applied;
    updates.push({ ...expense, paidAmount: expense.paidAmount + applied });
  }

  return updates;
}

/**
 * Splits tracked entries into "actual" (liquid, non-credit) balance and
 * pending credit-card debt. Credit purchases don't reduce the actual
 * balance until they're paid off — until then they accumulate as debt,
 * regardless of whether every installment has been billed yet.
 */
export function computeBalances(expenses: Expense[], accounts: Account[]) {
  const creditAccountIds = new Set(
    accounts.filter(a => a.type === "credit").map(a => a.id)
  );

  let actualBalance = 0;
  let debt = 0;

  for (const expense of expenses) {
    if (!expense.affectsBalance || expense.pending) continue;

    const isCredit = !!expense.accountId && creditAccountIds.has(expense.accountId);

    if (isCredit) {
      debt += entryRemainingDebt(expense);
    } else {
      actualBalance += signedAmount(expense);
    }
  }

  return {
    actualBalance,
    debt,
    generalBalance: actualBalance - debt,
  };
}

/** Total remaining balance for a single account: all unpaid installments (billed or not) for credit, net movement otherwise. */
export function computeAccountBalance(account: Account, expenses: Expense[]) {
  const linked = expenses.filter(
    e => e.affectsBalance && !e.pending && e.accountId === account.id
  );

  if (account.type === "credit") {
    return linked.reduce((total, e) => total + entryRemainingDebt(e), 0);
  }

  return linked.reduce((total, e) => total + signedAmount(e), 0);
}

/** Amount currently billed and unpaid for a credit account (the installments due this cycle or earlier). */
export function computeAccountDueNow(
  account: Account,
  expenses: Expense[],
  asOf: Date = new Date()
) {
  if (account.type !== "credit" || account.paymentDay == null) return 0;

  const total = expenses
    .filter(e => e.affectsBalance && !e.pending && e.accountId === account.id)
    .reduce((sum, e) => sum + computeEntryDueNow(e, account.paymentDay!, asOf), 0);

  return Math.max(0, total);
}
