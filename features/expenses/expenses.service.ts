import { Expense } from "./expenses.types";
import { mockExpenses } from "./expenses.mock";

let expenses = [...mockExpenses];

export const expensesService = {
  getAll: async (): Promise<Expense[]> => {
    await delay(300);
    return expenses;
  },

  create: async (expense: Expense): Promise<Expense> => {
    await delay(300);
    expenses = [expense, ...expenses];
    return expense;
  },

  update: async (expense: Expense): Promise<Expense> => {
    await delay(300);
    expenses = expenses.map(e => (e.id === expense.id ? expense : e));
    return expense;
  },

  delete: async (id: string): Promise<void> => {
    await delay(300);
    expenses = expenses.filter(e => e.id !== id);
  },
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
