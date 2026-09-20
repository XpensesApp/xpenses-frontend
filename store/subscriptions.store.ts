import { create } from "zustand";
import { Subscription } from "@/features/subscriptions/subscriptions.types";
import { subscriptionsService } from "@/features/subscriptions/subscriptions.service";

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
    const updated = await subscriptionsService.update(subscription);
    set(state => ({
      subscriptions: state.subscriptions.map(s => (s.id === updated.id ? updated : s)),
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

    const updated = await subscriptionsService.update({
      ...subscription,
      status: subscription.status === "active" ? "paused" : "active",
    });
    set(state => ({
      subscriptions: state.subscriptions.map(s => (s.id === id ? updated : s)),
    }));
  },
}));
