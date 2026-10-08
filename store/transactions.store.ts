import { create } from "zustand";
import { Transaction } from "@/features/transactions/transactions.types";
import { transactionsService } from "@/features/transactions/transactions.service";
import { useAccountsStore } from "@/store/accounts.store";
import { Account } from "@/features/accounts/accounts.types";
import { addDays, latestDueDate } from "@/lib/dates";

type DateRange = { from: string; to: string };

// Account balances are maintained server-side, so they go stale in the
// accounts store the moment a transaction is created/edited/deleted —
// refresh them so computed figures (e.g. card debt) update immediately
// instead of only after the next full page load. Best-effort: the
// transaction mutation itself already succeeded by the time this runs, so a
// flaky refresh shouldn't surface as a failed save/delete.
async function refreshAccounts() {
  try {
    await useAccountsStore.getState().loadAccounts();
  } catch {
    // Stale balances will catch up on the next load elsewhere.
  }
}

// A write that touches a credit card recalculates that card's one pending
// statement server-side (created, updated, or deleted outright) before the
// response comes back — so it has to be refetched rather than patched
// locally. It's always the transaction dated on the card's latest due date
// (see `latestDueDate`), per the backend's own recipe for finding it.
async function refreshCardStatement(cardAccountId: string, paymentDay: number) {
  const due = latestDueDate(paymentDay);
  const page = await transactionsService.list({ from: due, to: due });
  const fresh = page.transactions.find(t => t.statement?.accountId === cardAccountId);

  useTransactionsStore.setState(state => {
    // Drop whatever pending statement we had locally for this card unless
    // it's the one we just fetched — it may have been replaced (next
    // month's took over) or deleted outright (nothing due anymore).
    const withoutStalePending = state.transactions.filter(
      t => !(t.statement?.accountId === cardAccountId && t.pending && t.id !== fresh?.id)
    );
    if (!fresh) return { transactions: withoutStalePending };
    return {
      transactions: [fresh, ...withoutStalePending.filter(t => t.id !== fresh.id)],
    };
  });
}

// A write can touch up to two cards — whichever account(s) the transaction
// referenced before and after it, since e.g. editing a purchase to point at
// a different card changes both cards' statements. Best-effort: a failed
// recalculation here is caught by the backend's own nightly job regardless.
async function refreshTouchedCardStatements(...transactions: (Transaction | undefined)[]) {
  const accounts = useAccountsStore.getState().accounts;
  const cardIds = new Set<string>();
  for (const t of transactions) {
    if (!t) continue;
    if (t.accountId) cardIds.add(t.accountId);
    if (t.targetAccountId) cardIds.add(t.targetAccountId);
  }

  const cards = [...cardIds]
    .map(id => accounts.find(a => a.id === id))
    .filter((a): a is Account => !!a && a.type === "credit" && a.paymentDay != null);

  await Promise.all(
    cards.map(card =>
      refreshCardStatement(card.id, card.paymentDay!).catch(() => {})
    )
  );
}

type TransactionsState = {
  transactions: Transaction[];
  /** The overall span currently loaded (union of every page/range fetched so far). */
  dateRange: DateRange | null;
  /** Cursor for the next page within `dateRange`; null once that range is fully loaded. */
  nextToken: string | null;
  /** False once a `loadMoreTransactions` attempt finds nothing older left to load. */
  hasMore: boolean;
  isLoadingMore: boolean;
  loadTransactions: () => Promise<void>;
  /** Pages through the current range first, then extends it one month further into the past. */
  loadMoreTransactions: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string, date: string) => Promise<void>;
};

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  dateRange: null,
  nextToken: null,
  hasMore: true,
  isLoadingMore: false,

  loadTransactions: async () => {
    const page = await transactionsService.list();
    set({
      transactions: page.transactions,
      dateRange: page.dateRange,
      nextToken: page.nextToken,
      hasMore: true,
    });
  },

  loadMoreTransactions: async () => {
    const { dateRange, nextToken, isLoadingMore } = get();
    if (!dateRange || isLoadingMore) return;

    set({ isLoadingMore: true });
    try {
      // Still more pages within the currently loaded range — fetch the next
      // one before reaching further into the past.
      if (nextToken) {
        const page = await transactionsService.list({
          from: dateRange.from,
          to: dateRange.to,
          nextToken,
        });
        set(state => ({
          transactions: [...state.transactions, ...page.transactions],
          nextToken: page.nextToken,
          isLoadingMore: false,
        }));
        return;
      }

      // The current range is exhausted — extend it one calendar month
      // further into the past (the backend's own default span), using `to`
      // one day before the oldest date already loaded so the ranges don't
      // overlap.
      const page = await transactionsService.list({ to: addDays(dateRange.from, -1) });
      set(state => ({
        transactions: [...state.transactions, ...page.transactions],
        dateRange: { from: page.dateRange.from, to: state.dateRange!.to },
        nextToken: page.nextToken,
        hasMore: page.transactions.length > 0 || page.nextToken !== null,
        isLoadingMore: false,
      }));
    } catch (error) {
      set({ isLoadingMore: false });
      throw error;
    }
  },

  addTransaction: async (transaction) => {
    const created = await transactionsService.create(transaction);
    set(state => ({
      transactions: [created, ...state.transactions],
    }));
    await refreshAccounts();
    await refreshTouchedCardStatements(created);
  },

  updateTransaction: async (transaction) => {
    const previous = get().transactions.find(t => t.id === transaction.id);
    const updated = await transactionsService.update(transaction);
    set(state => ({
      transactions: state.transactions.map(t => (t.id === updated.id ? updated : t)),
    }));
    await refreshAccounts();
    await refreshTouchedCardStatements(previous, updated);
  },

  // The backend's delete key is `email` + `transactionId` + `date`, so the
  // date has to travel alongside the id — it can't be looked up from `id`
  // alone the way the in-memory mock could.
  deleteTransaction: async (id, date) => {
    const existing = get().transactions.find(t => t.id === id);
    await transactionsService.delete(id, date);
    set(state => ({
      transactions: state.transactions.filter(t => t.id !== id),
    }));
    await refreshAccounts();
    await refreshTouchedCardStatements(existing);
  },
}));
