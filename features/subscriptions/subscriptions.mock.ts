import { Subscription } from "./subscriptions.types";

export const mockSubscriptions: Subscription[] = [
  {
    id: "1",
    title: "Netflix",
    amount: 9990,
    category: "Entretenimiento",
    billingDay: 5,
    type: "expense",
    affectsBalance: true,
    status: "active",
    createdAt: "2026-01-01",
  },
  {
    id: "2",
    title: "Cuenta de la Luz",
    category: "Servicios",
    billingDay: 20,
    type: "expense",
    affectsBalance: true,
    status: "active",
    createdAt: "2026-01-01",
  },
];
