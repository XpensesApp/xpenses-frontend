export type ExpenseType = "expense" | "income";

export type Expense = {
  id: string;
  title: string;
  amount: number;
  /** Categories/tags this entry belongs to. An empty array means uncategorized. */
  categories: string[];
  date: string;
  type: ExpenseType;
  /** Whether this entry affects the balance total, or is only referencial. Defaults to true. */
  affectsBalance: boolean;
  /** Account this entry is charged to. Undefined means untracked (no account). */
  accountId?: string;
  /** Number of installments ("cuotas") this entry is split into. Only relevant for credit purchases. */
  installments?: number;
  /**
   * The credit account's payment day, snapshotted at the moment of purchase.
   * Its presence — not the currently-linked account's type — is the permanent
   * signal that this entry is a credit purchase. Never re-derived from the
   * live account, so editing or deleting a card never rewrites the schedule
   * of past purchases.
   */
  paymentDay?: number;
  /** True for an entry auto-generated from a subscription that hasn't been paid/confirmed yet. */
  pending: boolean;
  /** Links this entry back to the subscription that generated it, if any. */
  subscriptionId?: string;
  /** The billing cycle ("YYYY-MM") this entry belongs to, set once at creation and never changed — even once paid — so we know which cycles already have an entry regardless of when it was actually paid. */
  billingPeriod?: string;
};
