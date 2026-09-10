export type AccountType = "debit" | "credit" | "cash" | "other";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  /** Day of the month payment is due. Only relevant for account types that require it (e.g. credit). */
  paymentDay?: number;
  /** Whether this is the account pre-selected when registering a new entry. */
  isDefault?: boolean;
  /**
   * True only for the synthetic, built-in "untracked" account. Never persisted
   * through the accounts service or store — it's injected purely for display,
   * so it can't be edited, deleted, or set as default.
   */
  isUntracked?: boolean;
};

export const UNTRACKED_ACCOUNT_ID = "untracked";

/** Represents every entry left without a linked account (`accountId`/`sourceAccountId` undefined). Not a real account — never create, update, or delete it. */
export const untrackedAccount: Account = {
  id: UNTRACKED_ACCOUNT_ID,
  name: "Sin cuenta",
  type: "other",
  isUntracked: true,
};
