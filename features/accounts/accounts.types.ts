export type AccountType = "debit" | "credit" | "cash" | "other";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  /** Day of the month payment is due. Only relevant for account types that require it (e.g. credit). */
  paymentDay?: number;
  /**
   * True for the backend's one fixed per-user default account (`accountId:
   * "default"`, created by `POST /auth/sync` on login) — a transaction that
   * omits `accountId` lands here. Not settable from the frontend; there's no
   * API to change which account is the default, only to rename it.
   */
  isDefault?: boolean;
  /**
   * The account preselected for new transactions — the user's choice, not
   * the backend's fallback (`isDefault`/General, which stays unchanged).
   * Exactly one account always has this (General until the user picks
   * another). Settable via `PUT /accounts/preferred`, including a credit
   * card.
   */
  isPreferred?: boolean;
  /**
   * Marks this account's money as set aside rather than freely spendable.
   * Transactions and payments linked to it are excluded from `actualBalance`
   * and instead counted in `savings` (see `computeBalances`) — the account
   * still tracks its own running balance normally, and transactions against
   * it work exactly like any other account.
   */
  isSavings?: boolean;
  /**
   * True only for the synthetic, built-in "untracked" account. Never persisted
   * through the accounts service or store — it's injected purely for display,
   * so it can't be edited, deleted, or set as default.
   */
  isUntracked?: boolean;
  /**
   * Backend-maintained running balance (`GET`/`POST`/`PUT /accounts`),
   * already parsed from its decimal-string wire form — kept up to date
   * server-side on every transaction write, so it's correct even when not
   * all of this account's transactions are loaded locally. Undefined only
   * for the synthetic untracked account, which has no backend record;
   * `computeAccountBalance` falls back to summing transactions in that case.
   */
  balance?: number;
  /** The balance this account started at before any tracked transaction — editable via `AccountDialog` to reconcile `balance` with a real bank balance. */
  openingBalance?: number;
  /** How many transactions currently reference this account. The backend refuses to delete an account while this is > 0. */
  transactionCount?: number;
};

export const UNTRACKED_ACCOUNT_ID = "untracked";

/** Represents every entry left without a linked account (`accountId`/`sourceAccountId` undefined). Not a real account — never create, update, or delete it. */
export const untrackedAccount: Account = {
  id: UNTRACKED_ACCOUNT_ID,
  name: "Sin cuenta",
  type: "other",
  isUntracked: true,
};
