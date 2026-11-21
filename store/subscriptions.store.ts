import { create } from "zustand";
import { Subscription } from "@/features/subscriptions/subscriptions.types";
import { subscriptionsService } from "@/features/subscriptions/subscriptions.service";
import { useTransactionsStore } from "@/store/transactions.store";
import { errorStatus, sameList } from "@/lib/utils";

// Changing a subscription's categories makes the backend rewrite the categories
// of every transaction linked to it (paid or pending, any date), and its
// response says nothing about those — so the loaded transactions are refetched.
// Best-effort: the update itself already succeeded by the time this runs.
async function refreshLinkedTransactions() {
  try {
    await useTransactionsStore.getState().loadTransactions();
  } catch {
    // The next load of the movements list picks the new categories up.
  }
}

type SubscriptionsState = {
  subscriptions: Subscription[];
  loadSubscriptions: () => Promise<void>;
  addSubscription: (subscription: Omit<Subscription, "id" | "createdAt">) => Promise<void>;
  updateSubscription: (subscription: Subscription) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  toggleSubscriptionStatus: (id: string) => Promise<void>;
};

export const useSubscriptionsStore = create<SubscriptionsState>((set, get) => ({
  subscriptions: [],

  loadSubscriptions: async () => {
    const data = await subscriptionsService.getAll();
    set({ subscriptions: data });
  },

  addSubscription: async (subscription) => {
    const created = await subscriptionsService.create(subscription);
    set(state => ({
      subscriptions: [created, ...state.subscriptions],
    }));
  },

  updateSubscription: async (subscription) => {
    const previous = get().subscriptions.find(s => s.id === subscription.id);
    const updated = await subscriptionsService.update(subscription);
    set(state => ({
      subscriptions: state.subscriptions.map(s => (s.id === updated.id ? updated : s)),
    }));
    if (previous && !sameList(previous.categories, updated.categories)) await refreshLinkedTransactions();
  },

  deleteSubscription: async (id) => {
    try {
      await subscriptionsService.delete(id);
    } catch (error) {
      // A 404 means it's already gone (deleted from another tab or device, or a
      // repeated request) — which is the end state the user asked for, so it
      // isn't an error; the entry just has to leave the list.
      if (errorStatus(error) !== 404) throw error;
    }
    set(state => ({
      subscriptions: state.subscriptions.filter(s => s.id !== id),
    }));
  },

  toggleSubscriptionStatus: async (id) => {
    const subscription = get().subscriptions.find(s => s.id === id);
    if (!subscription) return;

    const updated = await subscriptionsService.update({
      ...subscription,
      status: subscription.status === "active" ? "paused" : "active",
    });
    set(state => ({
      subscriptions: state.subscriptions.map(s => (s.id === id ? updated : s)),
    }));
  },
}));
