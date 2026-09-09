export type ExpenseType = "expense" | "income";

export type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  type: ExpenseType;
};
