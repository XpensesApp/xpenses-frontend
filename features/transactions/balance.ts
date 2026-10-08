import { Transaction } from "./transactions.types";
import { Account, untrackedAccount } from "@/features/accounts/accounts.types";

function signedAmount(transaction: Transaction) {
  return transaction.type === "income" ? transaction.amount : -transaction.amount;
}

/**
 * How many of a purchase's installments have been billed and paid off, out
 * of how many total — read from every loaded statement's `lines` (the
 * backend's own billing breakdown) rather than recomputed client-side. A
 * line only exists once its cuota has actually been billed, so `total` here
 * is "billed so far", not the purchase's full `installments` count, until
 * every cuota has appeared across some statement.
 */
export function countPaidInstallments(
  purchaseId: string,
  transactions: Transaction[]
): { paid: number; total: number } | null {
  let paid = 0;
  let total = 0;

  for (const statementTransaction of transactions) {
    if (!statementTransaction.statement) continue;
    for (const line of statementTransaction.statement.lines) {
      if (line.transactionId !== purchaseId) continue;
      total = Math.max(total, line.installments);
      if (!statementTransaction.pending) paid++;
    }
  }

  return total > 0 ? { paid, total } : null;
}

/**
 * Splits tracked entries into "actual" (liquid, freely spendable) balance,
 * money set aside in savings accounts, and outstanding credit-card debt.
 * Anything linked to a savings account (`Account.isSavings`) is routed into
 * `savings` instead of `actualBalance` — it's still yours, just not
 * spendable — while `generalBalance` (true net worth) folds it back in.
 *
 * Each known account's contribution comes from its own `balance` (the
 * backend's running total — see `computeAccountBalance`) instead of summing
 * `transactions`. Entries with no linked account at all ("untracked") have
 * no backend equivalent, so they're always summed directly from
 * `transactions`.
 */
export function computeBalances(transactions: Transaction[], accounts: Account[]) {
  let actualBalance = 0;
  let savings = 0;
  let debt = 0;

  for (const account of accounts) {
    const balance = computeAccountBalance(account, transactions);
    if (account.type === "credit") {
      debt += balance;
    } else if (account.isSavings) {
      savings += balance;
    } else {
      actualBalance += balance;
    }
  }

  actualBalance += computeAccountBalance(untrackedAccount, transactions);

  return {
    actualBalance,
    savings,
    debt,
    generalBalance: actualBalance + savings - debt,
  };
}

/**
 * Balance for a single account: card debt for credit accounts, net cash
 * movement otherwise. The synthetic untracked account matches entries with
 * no linked account at all, rather than a specific id.
 *
 * `account.balance`, when present, is the server's own running total of
 * this account's transactions (`GET`/`POST`/`PUT /accounts`) — purchases,
 * refunds, and any settled payment/transfer into or out of it (including
 * paying off a credit card's statement) are all folded in atomically on the
 * backend, so this is used as-is rather than re-derived from `transactions`.
 * Falls back to summing `transactions` entirely when there's no backend
 * balance — true only for the synthetic untracked account, which has no
 * backend record at all.
 */
export function computeAccountBalance(account: Account, transactions: Transaction[]): number {
  if (account.balance !== undefined) {
    // account.balance is -purchases + refunds + settled payments; floored at
    // 0 so an overpaid card reads as "no debt" here rather than a confusing
    // negative figure — the overpayment itself shows up as a credit on the
    // card's next statement (`statement.amountDue` going negative).
    return account.type === "credit" ? Math.max(0, -account.balance) : account.balance;
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

  return net;
}
