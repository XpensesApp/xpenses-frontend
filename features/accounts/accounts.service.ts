import { Account } from "./accounts.types";
import { mockAccounts } from "./accounts.mock";

let accounts = [...mockAccounts];

export const accountsService = {
  getAll: async (): Promise<Account[]> => {
    await delay(300);
    return accounts;
  },

  create: async (account: Account): Promise<Account> => {
    await delay(300);
    accounts = [account, ...accounts];
    return account;
  },

  update: async (account: Account): Promise<Account> => {
    await delay(300);
    accounts = accounts.map(a => (a.id === account.id ? account : a));
    return account;
  },

  delete: async (id: string): Promise<void> => {
    await delay(300);
    accounts = accounts.filter(a => a.id !== id);
  },
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
