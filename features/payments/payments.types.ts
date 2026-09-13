export type Payment = {
  id: string;
  /** The credit account this payment reduces the debt of. */
  cardAccountId: string;
  amount: number;
  /** ISO date-time the payment was made. */
  date: string;
  /** Where the cash came from. Undefined means untracked (same convention as Transaction.accountId). */
  sourceAccountId?: string;
};
