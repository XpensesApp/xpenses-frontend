import { create } from "zustand";
import { Transaction } from "@/features/transactions/transactions.types";
import { transactionsService } from "@/features/transactions/transactions.service";

type TransactionsState = {
  transactions: Transaction[];
  loadTransactions: () => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
};

export const useTransactionsStore = create<TransactionsState>((set) => ({
  transactions: [],

  loadTransactions: async () => {
    const data = await transactionsService.getAll();
    set({ transactions: data });
  },

  addTransaction: async (transaction) => {
    await transactionsService.create(transaction);
    set(state => ({
      transactions: [transaction, ...state.transactions],
    }));
  },

  updateTransaction: async (transaction) => {
    await transactionsService.update(transaction);
    set(state => ({
      transactions: state.transactions.map(t => (t.id === transaction.id ? transaction : t)),
    }));
  },

  deleteTransaction: async (id) => {
    await transactionsService.delete(id);
    set(state => ({
      transactions: state.transactions.filter(t => t.id !== id),
    }));
  },
}));
