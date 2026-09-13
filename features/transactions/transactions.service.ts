import { Transaction } from "./transactions.types";
import { mockTransactions } from "./transactions.mock";

let transactions = [...mockTransactions];

export const transactionsService = {
  getAll: async (): Promise<Transaction[]> => {
    await delay(300);
    return transactions;
  },

  create: async (transaction: Transaction): Promise<Transaction> => {
    await delay(300);
    transactions = [transaction, ...transactions];
    return transaction;
  },

  update: async (transaction: Transaction): Promise<Transaction> => {
    await delay(300);
    transactions = transactions.map(t => (t.id === transaction.id ? transaction : t));
    return transaction;
  },

  delete: async (id: string): Promise<void> => {
    await delay(300);
    transactions = transactions.filter(t => t.id !== id);
  },
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
