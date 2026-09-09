export type AccountType = "debit" | "credit" | "cash" | "other";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  /** Day of the month payment is due. Only relevant for account types that require it (e.g. credit). */
  paymentDay?: number;
  /** Whether this is the account pre-selected when registering a new entry. */
  isDefault?: boolean;
};
