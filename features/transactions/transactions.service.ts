import { getSession } from "next-auth/react";
import { Transaction, TransactionType } from "./transactions.types";

const BASE_URL = process.env.NEXT_PUBLIC_TRANSACTIONS_API_BASE_URL!;

// The backend is currently unprotected: it identifies whose data is being
// read/written via an `email` field on every request, instead of a JWT. This
// is temporary (see the .env.example note), so the auth detail is kept local
// to this service rather than threaded through the store/UI — swapping it
// for a bearer token later should only touch this file.
async function currentEmail(): Promise<string> {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) throw new Error("No authenticated user email available.");
  return email;
}

type WireTransaction = {
  email: string;
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
  installments: number | null;
  paymentDay: number | null;
  subscriptionId: string | null;
  billingPeriod: string | null;
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
    installments: wire.installments ?? undefined,
    paymentDay: wire.paymentDay ?? undefined,
    subscriptionId: wire.subscriptionId ?? undefined,
    billingPeriod: wire.billingPeriod ?? undefined,
  };
}

// The backend only stores a bare "YYYY-MM-DD" — the frontend's `date` can
// carry a "YYYY-MM-DDTHH:mm" from the entry dialog's datetime-local input,
// so the time portion is dropped here rather than sent and silently ignored.
function toWirePayload(transaction: Omit<Transaction, "id">, email: string) {
  return {
    email,
    title: transaction.title,
    amount: transaction.amount.toFixed(2),
    categories: transaction.categories,
    date: transaction.date.slice(0, 10),
    type: transaction.type,
    affectsBalance: transaction.affectsBalance,
    pending: transaction.pending,
    accountId: transaction.accountId ?? null,
    installments: transaction.installments ?? null,
    paymentDay: transaction.paymentDay ?? null,
    subscriptionId: transaction.subscriptionId ?? null,
    billingPeriod: transaction.billingPeriod ?? null,
  };
}

async function parseError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => null);
  throw new Error(body?.message ?? fallback);
}

export const transactionsService = {
  getAll: async (): Promise<Transaction[]> => {
    const email = await currentEmail();
    const res = await fetch(`${BASE_URL}?email=${encodeURIComponent(email)}`);
    if (!res.ok) return parseError(res, "Failed to load transactions");
    const data = await res.json();
    return (data.transactions as WireTransaction[]).map(fromWire);
  },

  create: async (transaction: Omit<Transaction, "id">): Promise<Transaction> => {
    const email = await currentEmail();
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toWirePayload(transaction, email)),
    });
    if (!res.ok) return parseError(res, "Failed to create transaction");
    return fromWire(await res.json());
  },

  update: async (transaction: Transaction): Promise<Transaction> => {
    const email = await currentEmail();
    const res = await fetch(BASE_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...toWirePayload(transaction, email),
        transactionId: transaction.id,
      }),
    });
    if (!res.ok) return parseError(res, "Failed to update transaction");
    return fromWire(await res.json());
  },

  delete: async (id: string, date: string): Promise<void> => {
    const email = await currentEmail();
    const params = new URLSearchParams({
      email,
      transactionId: id,
      date: date.slice(0, 10),
    });
    const res = await fetch(`${BASE_URL}?${params.toString()}`, { method: "DELETE" });
    if (!res.ok) return parseError(res, "Failed to delete transaction");
  },
};
