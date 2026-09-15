import { create } from "zustand";
import { Transaction } from "@/features/transactions/transactions.types";
import { transactionsService } from "@/features/transactions/transactions.service";

type TransactionsState = {
  transactions: Transaction[];
  loadTransactions: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string, date: string) => Promise<void>;
};

export const useTransactionsStore = create<TransactionsState>((set) => ({
  transactions: [],

  loadTransactions: async () => {
    const data = await transactionsService.getAll();
    set({ transactions: data });
  },

  addTransaction: async (transaction) => {
    const created = await transactionsService.create(transaction);
    set(state => ({
      transactions: [created, ...state.transactions],
    }));
  },

  updateTransaction: async (transaction) => {
    const updated = await transactionsService.update(transaction);
    set(state => ({
      transactions: state.transactions.map(t => (t.id === updated.id ? updated : t)),
    }));
  },

  // The backend's delete key is `email` + `transactionId` + `date`, so the
  // date has to travel alongside the id — it can't be looked up from `id`
  // alone the way the in-memory mock could.
  deleteTransaction: async (id, date) => {
    await transactionsService.delete(id, date);
    set(state => ({
      transactions: state.transactions.filter(t => t.id !== id),
    }));
  },
}));
