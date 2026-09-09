import { create } from "zustand";
import { Expense } from "@/features/expenses/expenses.types";
import { expensesService } from "@/features/expenses/expenses.service";
import { computeEntryDueNow, computeEntryRemaining, distributePayment } from "@/features/expenses/balance";

type ExpensesState = {
  expenses: Expense[];
  loadExpenses: () => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  /** Pays down an account's currently billed installments (the amount due this cycle). */
  payBilledDebt: (accountId: string, amount: number, paymentDay: number) => Promise<void>;
  /** Pays down an account's full outstanding balance, including installments not yet billed. */
  payFullDebt: (accountId: string, amount: number) => Promise<void>;
};

export const useExpensesStore = create<ExpensesState>((set, get) => {
  async function applyPayment(updates: Expense[]) {
    await Promise.all(updates.map(e => expensesService.update(e)));
    set(state => ({
      expenses: state.expenses.map(
        e => updates.find(updated => updated.id === e.id) ?? e
      ),
    }));
  }

  return {
    expenses: [],

    loadExpenses: async () => {
      const data = await expensesService.getAll();
      set({ expenses: data });
    },

    addExpense: async (expense) => {
      await expensesService.create(expense);
      set(state => ({
        expenses: [expense, ...state.expenses],
      }));
    },

    updateExpense: async (expense) => {
      await expensesService.update(expense);
      set(state => ({
        expenses: state.expenses.map(e => (e.id === expense.id ? expense : e)),
      }));
    },

    deleteExpense: async (id) => {
      await expensesService.delete(id);
      set(state => ({
        expenses: state.expenses.filter(e => e.id !== id),
      }));
    },

    payBilledDebt: async (accountId, amount, paymentDay) => {
      const today = new Date();
      const entries = get().expenses.filter(e => e.accountId === accountId);
      const updates = distributePayment(entries, amount, e =>
        computeEntryDueNow(e, paymentDay, today)
      );
      await applyPayment(updates);
    },

    payFullDebt: async (accountId, amount) => {
      const entries = get().expenses.filter(e => e.accountId === accountId);
      const updates = distributePayment(entries, amount, computeEntryRemaining);
      await applyPayment(updates);
    },
  };
});
