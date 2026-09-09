import { ExpenseType } from "@/features/expenses/expenses.types";

export type SubscriptionStatus = "active" | "paused";

export type Subscription = {
  id: string;
  title: string;
  /** Fixed amount billed each cycle. Undefined means variable — the amount is set when paying each generated entry. */
  amount?: number;
  category: string;
  /** Day of the month this subscription is billed (1-31). */
  billingDay: number;
  type: ExpenseType;
  /** Whether entries generated from this subscription affect the balance by default. */
  affectsBalance: boolean;
  status: SubscriptionStatus;
  /** ISO date this subscription was created. Prevents generating entries for cycles before it existed. */
  createdAt: string;
  /** Optional custom end date (ISO). No entries are generated once this date has passed. */
  endDate?: string;
};
