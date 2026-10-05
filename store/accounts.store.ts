import { create } from "zustand";
import { Account } from "@/features/accounts/accounts.types";
import { accountsService } from "@/features/accounts/accounts.service";

type AccountsState = {
  accounts: Account[];
  loadAccounts: () => Promise<void>;
  addAccount: (account: Omit<Account, "id" | "balance" | "transactionCount">) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
};

export const useAccountsStore = create<AccountsState>(set => ({
  accounts: [],

  loadAccounts: async () => {
    const data = await accountsService.getAll();
    set({ accounts: data });
  },

  // The backend generates accountId/balance/transactionCount, so the created
  // account used to update local state is its response, not the input.
  addAccount: async (account) => {
    const created = await accountsService.create(account);
    set(state => ({
      accounts: [...state.accounts, created],
    }));
  },

  updateAccount: async (account) => {
    const updated = await accountsService.update(account);
    set(state => ({
      accounts: state.accounts.map(a => (a.id === updated.id ? updated : a)),
    }));
  },

  deleteAccount: async (id) => {
    await accountsService.delete(id);
    set(state => ({
      accounts: state.accounts.filter(a => a.id !== id),
    }));
  },
}));
