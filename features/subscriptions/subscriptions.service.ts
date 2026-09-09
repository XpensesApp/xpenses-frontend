import { Subscription } from "./subscriptions.types";
import { mockSubscriptions } from "./subscriptions.mock";

let subscriptions = [...mockSubscriptions];

export const subscriptionsService = {
  getAll: async (): Promise<Subscription[]> => {
    await delay(300);
    return subscriptions;
  },

  create: async (subscription: Subscription): Promise<Subscription> => {
    await delay(300);
    subscriptions = [subscription, ...subscriptions];
    return subscription;
  },

  update: async (subscription: Subscription): Promise<Subscription> => {
    await delay(300);
    subscriptions = subscriptions.map(s => (s.id === subscription.id ? subscription : s));
    return subscription;
  },

  delete: async (id: string): Promise<void> => {
    await delay(300);
    subscriptions = subscriptions.filter(s => s.id !== id);
  },
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
