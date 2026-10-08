export type TransactionType = "expense" | "income" | "transfer";

export type Transaction = {
  id: string;
  title: string;
  amount: number;
  /** Categories/tags this entry belongs to. An empty array means uncategorized. */
  categories: string[];
  date: string;
  type: TransactionType;
  /** Whether this entry affects the balance total, or is only referencial. Defaults to true. */
  affectsBalance: boolean;
  /** Account this entry is charged to. Undefined means untracked (no account). For a transfer, this is the source account — required, never untracked. */
  accountId?: string;
  /** The destination account for a transfer. Required (and must differ from accountId) when type is "transfer"; undefined for every other type. */
  targetAccountId?: string;
  /** Number of installments ("cuotas") this entry is split into. Only relevant for credit purchases. */
  installments?: number;
  /** True for an entry auto-generated from a subscription — or, since the credit-card statement job, from a card's billing — that hasn't been paid/confirmed yet. */
  pending: boolean;
  /** Links this entry back to the subscription that generated it, if any. */
  subscriptionId?: string;
  /** The billing cycle ("YYYY-MM") this entry belongs to, set once at creation and never changed — even once paid — so we know which cycles already have an entry regardless of when it was actually paid. */
  billingPeriod?: string;
  /**
   * Present only on a credit card's monthly statement — a server-generated
   * `transfer` (pending until paid) from whichever account settles it into
   * the card. Server-managed: the backend always keeps `type`,
   * `targetAccountId` and this field from the stored item regardless of what
   * a `PUT` sends, and ignores it entirely on `POST`. A card only ever has
   * one pending statement at a time; an unpaid one is replaced by next
   * month's, which folds its full amount into `previousBalance`.
   */
  statement?: StatementInfo;
};

export type StatementLine = {
  /** The purchase this cuota belongs to. */
  transactionId: string;
  title: string;
  date: string;
  /** Which cuota this is (1-based) and how many the purchase was split into. */
  installment: number;
  installments: number;
  amount: number;
};

export type StatementInfo = {
  /** The credit account this statement bills. */
  accountId: string;
  /** This cycle's cuotas across every active purchase. */
  installmentsDue: number;
  /** Whatever was still owed from the previous statement. */
  previousBalance: number;
  /** What's due now (`installmentsDue + previousBalance`, net of any payments/refunds since). Can be negative — a credit from overpaying — in which case the transaction's own `amount` is `0`. */
  amountDue: number;
  /** Cuotas billed since the last *paid* statement — `previousBalance` covers everything older. */
  lines: StatementLine[];
  /** The card's first-ever statement date. */
  since: string;
  /** Bumped on every recalculation (any write touching this card recalculates it) — a cheap way to tell a statement changed. */
  revision: number;
};
