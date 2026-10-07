import { getCurrentAuthToken, forceReauth } from "@/lib/current-auth-token";
import { Transaction, TransactionType } from "./transactions.types";

const BASE_URL = process.env.NEXT_PUBLIC_TRANSACTIONS_API_BASE_URL!;

type WireTransaction = {
  title: string;
  amount: string;
  categories: string[];
  date: string;
  type: TransactionType;
  affectsBalance: boolean;
  pending: boolean;
  transactionId: string;
  sk: string;
  accountId: string | null;
  targetAccountId: string | null;
  installments: number | null;
  paymentDay: number | null;
  subscriptionId: string | null;
  billingPeriod: string | null;
};

export type TransactionsPage = {
  transactions: Transaction[];
  dateRange: { from: string; to: string };
  nextToken: string | null;
};

export type ListTransactionsParams = {
  from?: string;
  to?: string;
  limit?: number;
  nextToken?: string;
};

function fromWire(wire: WireTransaction): Transaction {
  return {
    id: wire.transactionId,
    title: wire.title,
    amount: Number(wire.amount),
    categories: wire.categories,
    date: wire.date,
    type: wire.type,
    affectsBalance: wire.affectsBalance,
    pending: wire.pending,
    accountId: wire.accountId ?? undefined,
    targetAccountId: wire.targetAccountId ?? undefined,
    installments: wire.installments ?? undefined,
    paymentDay: wire.paymentDay != null ? Number(wire.paymentDay) : undefined,
    subscriptionId: wire.subscriptionId ?? undefined,
    billingPeriod: wire.billingPeriod ?? undefined,
  };
}

// The backend only stores a bare "YYYY-MM-DD" — the frontend's `date` can
// carry a "YYYY-MM-DDTHH:mm" from the entry dialog's datetime-local input,
// so the time portion is dropped here rather than sent and silently ignored.
function toWirePayload(transaction: Omit<Transaction, "id">) {
  return {
    title: transaction.title,
    amount: transaction.amount.toFixed(2),
    categories: transaction.categories,
    date: transaction.date.slice(0, 10),
    type: transaction.type,
    affectsBalance: transaction.affectsBalance,
    pending: transaction.pending,
    accountId: transaction.accountId ?? null,
    targetAccountId: transaction.targetAccountId ?? null,
    installments: transaction.installments ?? null,
    paymentDay: transaction.paymentDay ?? null,
    subscriptionId: transaction.subscriptionId ?? null,
    billingPeriod: transaction.billingPeriod ?? null,
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
  // .status lets callers special-case a 409 (changed/deleted concurrently —
  // reload and retry) without string-matching the message.
  const error = new Error(body?.message ?? fallback) as Error & { status?: number };
  error.status = res.status;
  throw error;
}

export const transactionsService = {
  // No params means "the last calendar month, first page" (the backend's own
  // defaults) — see TransactionsPage/ListTransactionsParams for the date
  // range + paging contract.
  list: async (params: ListTransactionsParams = {}): Promise<TransactionsPage> => {
    const query = new URLSearchParams();
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    if (params.limit) query.set("limit", String(params.limit));
    if (params.nextToken) query.set("nextToken", params.nextToken);
    const url = query.size > 0 ? `${BASE_URL}?${query.toString()}` : BASE_URL;

    const res = await fetch(url, { headers: await authHeaders() });
    if (!res.ok) return parseError(res, "Failed to load transactions");
    const data = await res.json();
    return {
      transactions: (data.transactions as WireTransaction[]).map(fromWire),
      dateRange: data.dateRange,
      nextToken: data.nextToken ?? null,
    };
  },

  create: async (transaction: Omit<Transaction, "id">): Promise<Transaction> => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(toWirePayload(transaction)),
    });
    if (!res.ok) return parseError(res, "Failed to create transaction");
    return fromWire(await res.json());
  },

  update: async (transaction: Transaction): Promise<Transaction> => {
    const res = await fetch(BASE_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({
        ...toWirePayload(transaction),
        transactionId: transaction.id,
      }),
    });
    if (!res.ok) return parseError(res, "Failed to update transaction");
    return fromWire(await res.json());
  },

  delete: async (id: string, date: string): Promise<void> => {
    const params = new URLSearchParams({
      transactionId: id,
      date: date.slice(0, 10),
    });
    const res = await fetch(`${BASE_URL}?${params.toString()}`, {
      method: "DELETE",
      headers: await authHeaders(),
    });
    if (!res.ok) return parseError(res, "Failed to delete transaction");
  },
};
