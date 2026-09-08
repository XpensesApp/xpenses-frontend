import { create } from "zustand";
import { Expense } from "@/features/expenses/expenses.types";
import { expensesService } from "@/features/expenses/expenses.service";

type ExpensesState = {
  expenses: Expense[];
  loadExpenses: () => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
};

export const useExpensesStore = create<ExpensesState>((set) => ({
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
}));
