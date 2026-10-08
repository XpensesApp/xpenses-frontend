import { getCurrentAuthToken, forceReauth } from "@/lib/current-auth-token";
import { Account, AccountType } from "./accounts.types";

const BASE_URL = process.env.NEXT_PUBLIC_ACCOUNTS_API_BASE_URL!;

type WireAccount = {
  accountId: string;
  name: string;
  type: AccountType;
  isSavings: boolean;
  paymentDay: number | null;
  openingBalance: string;
  balance: string;
  transactionCount: number;
  isDefault: boolean;
  isPreferred: boolean;
  createdAt: string;
  updatedAt: string;
};

type AccountInput = Omit<Account, "id" | "balance" | "transactionCount">;

function fromWire(wire: WireAccount): Account {
  return {
    id: wire.accountId,
    name: wire.name,
    type: wire.type,
    isSavings: wire.isSavings,
    paymentDay: wire.paymentDay != null ? Number(wire.paymentDay) : undefined,
    isDefault: wire.isDefault,
    isPreferred: wire.isPreferred,
    balance: Number(wire.balance),
    openingBalance: Number(wire.openingBalance),
    transactionCount: wire.transactionCount,
  };
}

// accountId/balance/transactionCount/isDefault/createdAt/updatedAt are
// server-managed (ignored if sent), so this payload shape covers both create
// and update — update additionally sends `accountId` on top of this.
function toWirePayload(account: AccountInput) {
  return {
    name: account.name,
    type: account.type,
    isSavings: account.isSavings ?? false,
    paymentDay: account.paymentDay ?? null,
    openingBalance: (account.openingBalance ?? 0).toFixed(2),
  };
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getCurrentAuthToken();
  return { Authorization: `Bearer ${token}` };
}

async function parseError(res: Response, fallback: string): Promise<never> {
  // A locally-unexpired token can still be rejected server-side (clock skew,
  // revocation) — treat any 401 the same as an expired token.
  if (res.status === 401) forceReauth();
  const body = await res.json().catch(() => null);
  const error = new Error(body?.message ?? fallback) as Error & { status?: number };
  error.status = res.status;
  throw error;
}

export const accountsService = {
  // All accounts in one response (no paging) — default account first, then
  // oldest first.
  getAll: async (): Promise<Account[]> => {
    const res = await fetch(BASE_URL, { headers: await authHeaders() });
    if (!res.ok) return parseError(res, "Failed to load accounts");
    const data = await res.json();
    return (data.accounts as WireAccount[]).map(fromWire);
  },

  create: async (account: AccountInput): Promise<Account> => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(toWirePayload(account)),
    });
    if (!res.ok) return parseError(res, "Failed to create account");
    return fromWire(await res.json());
  },

  update: async (account: Account): Promise<Account> => {
    const res = await fetch(BASE_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ ...toWirePayload(account), accountId: account.id }),
    });
    if (!res.ok) return parseError(res, "Failed to update account");
    return fromWire(await res.json());
  },

  delete: async (id: string): Promise<void> => {
    const params = new URLSearchParams({ accountId: id });
    const res = await fetch(`${BASE_URL}?${params.toString()}`, {
      method: "DELETE",
      headers: await authHeaders(),
    });
    if (!res.ok) return parseError(res, "Failed to delete account");
  },

  // Send "default" to reset the preference back to General.
  setPreferred: async (accountId: string): Promise<string> => {
    const res = await fetch(`${BASE_URL}/preferred`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ accountId }),
    });
    if (!res.ok) return parseError(res, "Failed to set preferred account");
    return (await res.json()).preferredAccountId;
  },
};
