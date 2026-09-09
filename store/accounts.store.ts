import { create } from "zustand";
import { Account } from "@/features/accounts/accounts.types";
import { accountsService } from "@/features/accounts/accounts.service";

type AccountsState = {
  accounts: Account[];
  loadAccounts: () => Promise<void>;
  addAccount: (account: Account) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  /** Marks the given account as default, unsetting any previous default. Passing the current default's id clears it. */
  setDefaultAccount: (id: string) => Promise<void>;
};

export const useAccountsStore = create<AccountsState>((set, get) => ({
  accounts: [],

  loadAccounts: async () => {
    const data = await accountsService.getAll();
    set({ accounts: data });
  },

  addAccount: async (account) => {
    await accountsService.create(account);
    set(state => ({
      accounts: [account, ...state.accounts],
    }));
  },

  updateAccount: async (account) => {
    await accountsService.update(account);
    set(state => ({
      accounts: state.accounts.map(a => (a.id === account.id ? account : a)),
    }));
  },

  deleteAccount: async (id) => {
    await accountsService.delete(id);
    set(state => ({
      accounts: state.accounts.filter(a => a.id !== id),
    }));
  },

  setDefaultAccount: async (id) => {
    const current = get().accounts;
    const target = current.find(a => a.id === id);
    if (!target) return;

    const makeDefault = !target.isDefault;
    const changed = current.filter(
      a => a.id === id || a.isDefault
    );

    await Promise.all(
      changed.map(a =>
        accountsService.update({
          ...a,
          isDefault: a.id === id ? makeDefault : false,
        })
      )
    );

    set(state => ({
      accounts: state.accounts.map(a => ({
        ...a,
        isDefault: a.id === id ? makeDefault : false,
      })),
    }));
  },
}));
