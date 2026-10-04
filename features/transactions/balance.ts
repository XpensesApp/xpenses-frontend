import { Transaction } from "./transactions.types";
import { Account } from "@/features/accounts/accounts.types";
import { Payment } from "@/features/payments/payments.types";
import { clampDayToMonth, periodKey } from "@/lib/dates";

function signedAmount(transaction: Transaction) {
  return transaction.type === "income" ? transaction.amount : -transaction.amount;
}

export type InstallmentInfo = {
  index: number;
  total: number;
  dueDate: Date;
  amount: number;
};

/**
 * Splits a credit purchase into its monthly installments ("cuotas"), using
 * the payment day snapshotted on the purchase itself — never the linked
 * account's current setting, so editing a card never rewrites past
 * purchases. Returns an empty schedule for non-credit entries.
 */
export function getInstallmentSchedule(purchase: Transaction): InstallmentInfo[] {
  if (purchase.paymentDay == null) return [];

  const paymentDay = purchase.paymentDay;
  const total = Math.max(1, purchase.installments ?? 1);
  const purchaseDate = new Date(purchase.date);
  const firstMonthOffset = purchaseDate.getDate() <= paymentDay ? 0 : 1;
  const baseAmount = Math.round(purchase.amount / total);

  const schedule: InstallmentInfo[] = [];
  let allocated = 0;

  for (let i = 0; i < total; i++) {
    const isLast = i === total - 1;
    const amount = isLast ? purchase.amount - allocated : baseAmount;
    allocated += amount;

    const year = purchaseDate.getFullYear();
    const month = purchaseDate.getMonth() + firstMonthOffset + i;

    schedule.push({
      index: i + 1,
      total,
      dueDate: new Date(year, month, clampDayToMonth(year, month, paymentDay)),
      amount,
    });
  }

  return schedule;
}

type LedgerItem = {
  purchaseId: string;
  dueDate: Date;
  amount: number;
  /** Portion of this installment still unpaid, after consuming the card's payments oldest-due-first. */
  remaining: number;
};

/**
 * The full obligation ledger for one credit card: every installment across
 * every purchase on that card, oldest due date first, with the card's total
 * payments consumed against it in that same order. This is the single
 * source of truth everything else in this module is derived from — a
 * payment is never attributed to a specific purchase when it's recorded,
 * only when this is read.
 *
 * An income entry linked to the card (a refund) never creates its own
 * obligation — it has no installments — and instead is folded into the same
 * pool as payments, reducing the oldest outstanding installments first.
 */
export function getCardLedger(
  cardAccountId: string,
  transactions: Transaction[],
  payments: Payment[]
): LedgerItem[] {
  const linkedEntries = transactions.filter(
    t => t.accountId === cardAccountId && t.paymentDay != null && t.affectsBalance && !t.pending
  );
  const purchases = linkedEntries.filter(t => t.type === "expense");
  const refunds = linkedEntries.filter(t => t.type === "income");

  const flattened = purchases.flatMap(purchase =>
    getInstallmentSchedule(purchase).map(installment => ({
      purchaseId: purchase.id,
      purchaseDate: purchase.date,
      dueDate: installment.dueDate,
      amount: installment.amount,
    }))
  );

  flattened.sort((a, b) => {
    const dueDiff = a.dueDate.getTime() - b.dueDate.getTime();
    return dueDiff !== 0 ? dueDiff : a.purchaseDate.localeCompare(b.purchaseDate);
  });

  let pool =
    payments
      .filter(p => p.cardAccountId === cardAccountId)
      .reduce((total, p) => total + p.amount, 0) +
    refunds.reduce((total, r) => total + r.amount, 0);

  return flattened.map(({ purchaseId, dueDate, amount }) => {
    const consumed = Math.min(pool, amount);
    pool -= consumed;
    return { purchaseId, dueDate, amount, remaining: amount - consumed };
  });
}

/** Total remaining balance on a credit card: every unpaid installment, billed or not. */
export function computeCardDebt(
  cardAccountId: string,
  transactions: Transaction[],
  payments: Payment[]
): number {
  return getCardLedger(cardAccountId, transactions, payments).reduce(
    (total, item) => total + item.remaining,
    0
  );
}

/**
 * The next thing a card owner needs to know about: what's billed and unpaid
 * right now, or — if nothing is due yet — a preview of the single soonest
 * upcoming period. This is a derived projection, not stored anywhere; the
 * next call after recording a payment simply reflects the smaller balance.
 * `isDue` tells the caller whether this is payable today (`dueDate <= asOf`)
 * or just a preview of what's coming — we don't support paying ahead of
 * schedule, so a preview should be shown without a working "pay" action.
 * Returns null only once every installment on the card is fully paid off.
 */
export function computeNextCardObligation(
  cardAccountId: string,
  transactions: Transaction[],
  payments: Payment[],
  asOf: Date = new Date()
): { amount: number; dueDate: Date; isDue: boolean } | null {
  const outstanding = getCardLedger(cardAccountId, transactions, payments).filter(
    item => item.remaining > 0
  );
  if (outstanding.length === 0) return null;

  const dueItems = outstanding.filter(item => item.dueDate <= asOf);
  const relevant = dueItems.length > 0 ? dueItems : upcomingPeriod(outstanding);

  return {
    amount: relevant.reduce((total, item) => total + item.remaining, 0),
    dueDate: relevant.reduce(
      (earliest, item) => (item.dueDate < earliest ? item.dueDate : earliest),
      relevant[0].dueDate
    ),
    isDue: dueItems.length > 0,
  };
}

/** All items sharing the same due period as the soonest one in `sortedByDueDate` (already oldest-first, per `getCardLedger`). */
function upcomingPeriod(sortedByDueDate: LedgerItem[]): LedgerItem[] {
  const soonest = periodKey(sortedByDueDate[0].dueDate);
  return sortedByDueDate.filter(item => periodKey(item.dueDate) === soonest);
}

/** Remaining balance grouped by due period ("2026-09"), sorted chronologically — includes the current period and every future one with a balance left. */
export function computeUpcomingObligations(
  cardAccountId: string,
  transactions: Transaction[],
  payments: Payment[]
): { period: string; amount: number }[] {
  const byPeriod = new Map<string, number>();

  for (const item of getCardLedger(cardAccountId, transactions, payments)) {
    if (item.remaining <= 0) continue;
    const key = periodKey(item.dueDate);
    byPeriod.set(key, (byPeriod.get(key) ?? 0) + item.remaining);
  }

  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, amount]) => ({ period, amount }));
}

/** How many of a purchase's installments are fully paid off, out of how many total. */
export function countRemainingInstallments(
  purchaseId: string,
  cardAccountId: string,
  transactions: Transaction[],
  payments: Payment[]
): { paid: number; total: number } {
  const items = getCardLedger(cardAccountId, transactions, payments).filter(
    item => item.purchaseId === purchaseId
  );

  return {
    paid: items.filter(item => item.remaining === 0).length,
    total: items.length,
  };
}

/**
 * Splits tracked entries into "actual" (liquid, freely spendable) balance,
 * money set aside in savings accounts, and outstanding credit-card debt.
 * Credit purchases don't reduce actual balance until they're paid off;
 * paying a card does, via its recorded payments. Anything linked to a
 * savings account (`Account.isSavings`) is routed into `savings` instead of
 * `actualBalance` — it's still yours, just not spendable — while
 * `generalBalance` (true net worth) folds it back in.
 */
export function computeBalances(
  transactions: Transaction[],
  payments: Payment[],
  accounts: Account[]
) {
  const savingsAccountIds = new Set(
    accounts.filter(a => a.isSavings).map(a => a.id)
  );

  let actualBalance = 0;
  let savings = 0;

  for (const transaction of transactions) {
    if (!transaction.affectsBalance || transaction.pending || transaction.paymentDay != null) continue;

    // A transfer is an outflow for its source and an inflow for its target —
    // each side lands in whichever bucket (actual/savings) that account
    // belongs to, so e.g. a transfer into a savings account correctly moves
    // money out of actualBalance and into savings rather than netting to
    // zero within a single bucket.
    if (transaction.type === "transfer") {
      if (transaction.accountId) {
        if (savingsAccountIds.has(transaction.accountId)) savings -= transaction.amount;
        else actualBalance -= transaction.amount;
      }
      if (transaction.targetAccountId) {
        if (savingsAccountIds.has(transaction.targetAccountId)) savings += transaction.amount;
        else actualBalance += transaction.amount;
      }
      continue;
    }

    const amount = signedAmount(transaction);
    if (transaction.accountId && savingsAccountIds.has(transaction.accountId)) {
      savings += amount;
    } else {
      actualBalance += amount;
    }
  }

  for (const payment of payments) {
    if (payment.sourceAccountId && savingsAccountIds.has(payment.sourceAccountId)) {
      savings -= payment.amount;
    } else {
      actualBalance -= payment.amount;
    }
  }

  const cardAccountIds = new Set(
    transactions
      .filter((t): t is Transaction & { accountId: string } => t.paymentDay != null && !!t.accountId)
      .map(t => t.accountId)
  );

  let debt = 0;
  for (const cardAccountId of cardAccountIds) {
    debt += computeCardDebt(cardAccountId, transactions, payments);
  }

  return {
    actualBalance,
    savings,
    debt,
    generalBalance: actualBalance + savings - debt,
  };
}

/** Balance for a single account: card debt for credit accounts, net cash movement (spending minus payments made from it) otherwise. The synthetic untracked account matches entries with no linked account at all, rather than a specific id. */
export function computeAccountBalance(
  account: Account,
  transactions: Transaction[],
  payments: Payment[]
): number {
  if (account.type === "credit") {
    return computeCardDebt(account.id, transactions, payments);
  }

  const matches = account.isUntracked
    ? (id: string | undefined) => !id
    : (id: string | undefined) => id === account.id;

  let net = 0;
  for (const t of transactions) {
    if (!t.affectsBalance || t.pending) continue;
    if (t.type === "transfer") {
      // A transfer touches two accounts in one record, so it's checked
      // against both sides rather than the single accountId every other
      // type uses — matches() on just t.accountId would miss this account
      // entirely whenever it's the target.
      if (matches(t.accountId)) net -= t.amount;
      if (matches(t.targetAccountId)) net += t.amount;
    } else if (matches(t.accountId)) {
      net += signedAmount(t);
    }
  }

  const paidOut = payments
    .filter(p => matches(p.sourceAccountId))
    .reduce((total, p) => total + p.amount, 0);

  return net - paidOut;
}
