import { create } from "zustand";
import { Subscription } from "@/features/subscriptions/subscriptions.types";
import { subscriptionsService } from "@/features/subscriptions/subscriptions.service";
import { mostRecentBillingDate } from "@/features/subscriptions/schedule";
import { toISODate, periodKey } from "@/lib/dates";
import { useExpensesStore } from "@/store/expenses.store";

type SubscriptionsState = {
  subscriptions: Subscription[];
  loadSubscriptions: () => Promise<void>;
  addSubscription: (subscription: Subscription) => Promise<void>;
  updateSubscription: (subscription: Subscription) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  toggleSubscriptionStatus: (id: string) => Promise<void>;
  /** Simulates the backend job that creates a pending entry once a subscription's billing day arrives. */
  syncDueEntries: () => Promise<void>;
};

export const useSubscriptionsStore = create<SubscriptionsState>((set, get) => ({
  subscriptions: [],

  loadSubscriptions: async () => {
    const data = await subscriptionsService.getAll();
    set({ subscriptions: data });
  },

  addSubscription: async (subscription) => {
    await subscriptionsService.create(subscription);
    set(state => ({
      subscriptions: [subscription, ...state.subscriptions],
    }));
  },

  updateSubscription: async (subscription) => {
    await subscriptionsService.update(subscription);
    set(state => ({
      subscriptions: state.subscriptions.map(s => (s.id === subscription.id ? subscription : s)),
    }));
  },

  deleteSubscription: async (id) => {
    await subscriptionsService.delete(id);
    set(state => ({
      subscriptions: state.subscriptions.filter(s => s.id !== id),
    }));
  },

  toggleSubscriptionStatus: async (id) => {
    const subscription = get().subscriptions.find(s => s.id === id);
    if (!subscription) return;

    const updated: Subscription = {
      ...subscription,
      status: subscription.status === "active" ? "paused" : "active",
    };

    await subscriptionsService.update(updated);
    set(state => ({
      subscriptions: state.subscriptions.map(s => (s.id === id ? updated : s)),
    }));
  },

  syncDueEntries: async () => {
    const today = new Date();
    const todayISO = toISODate(today);
    const subscriptions = get().subscriptions;
    const { expenses, addExpense } = useExpensesStore.getState();

    for (const subscription of subscriptions) {
      if (subscription.status !== "active") continue;
      if (subscription.endDate && subscription.endDate < todayISO) continue;

      const dueDate = mostRecentBillingDate(
        subscription.billingDay,
        today,
        new Date(subscription.createdAt)
      );
      if (!dueDate) continue;

      const period = periodKey(dueDate);
      const alreadyExists = expenses.some(
        e => e.subscriptionId === subscription.id && e.billingPeriod === period
      );
      if (alreadyExists) continue;

      await addExpense({
        id: crypto.randomUUID(),
        title: subscription.title,
        amount: subscription.amount ?? 0,
        category: subscription.category,
        date: toISODate(dueDate),
        type: subscription.type,
        affectsBalance: subscription.affectsBalance,
        pending: true,
        subscriptionId: subscription.id,
        billingPeriod: period,
      });
    }
  },
}));
