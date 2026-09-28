import { getCurrentAuthToken, forceReauth } from "@/lib/current-auth-token";
import { Subscription, SubscriptionStatus } from "./subscriptions.types";
import { TransactionType } from "@/features/transactions/transactions.types";

const BASE_URL = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_API_BASE_URL!;

// The backend's status values ("active"/"disabled") differ from the
// frontend's own ("active"/"paused") — the UI, its labels, and the
// pause/resume icons are all built around "paused", so that's kept as the
// frontend's internal vocabulary and adapted here at the wire boundary,
// rather than renaming it (and its lossy-if-multiple `category` similarly).
type WireStatus = "active" | "disabled";

const STATUS_TO_WIRE: Record<SubscriptionStatus, WireStatus> = {
  active: "active",
  paused: "disabled",
};

const STATUS_FROM_WIRE: Record<WireStatus, SubscriptionStatus> = {
  active: "active",
  disabled: "paused",
};

type WireSubscription = {
  title: string;
  billingDay: number;
  type: TransactionType;
  affectsBalance: boolean;
  status: WireStatus;
  subscriptionId: string;
  amount: string | null;
  categories: string[];
  createdAt: string;
  endDate: string | null;
};

function fromWire(wire: WireSubscription): Subscription {
  return {
    id: wire.subscriptionId,
    title: wire.title,
    amount: wire.amount != null ? Number(wire.amount) : undefined,
    // The frontend only models a single category per subscription; the
    // backend supports several. Taking the first is lossy only if something
    // else ever writes more than one — nothing here does.
    category: wire.categories[0] ?? "",
    billingDay: wire.billingDay,
    type: wire.type,
    affectsBalance: wire.affectsBalance,
    status: STATUS_FROM_WIRE[wire.status],
    createdAt: wire.createdAt,
    endDate: wire.endDate ?? undefined,
  };
}

// subscriptionId/createdAt are server-generated on create and aren't part of
// the PUT body either, so this payload shape covers both create and update.
function toWirePayload(subscription: Omit<Subscription, "id" | "createdAt">) {
  return {
    title: subscription.title,
    billingDay: subscription.billingDay,
    type: subscription.type,
    affectsBalance: subscription.affectsBalance,
    status: STATUS_TO_WIRE[subscription.status],
    amount: subscription.amount != null ? String(subscription.amount) : null,
    categories: subscription.category ? [subscription.category] : [],
    endDate: subscription.endDate ?? null,
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
  throw new Error(body?.message ?? fallback);
}

export const subscriptionsService = {
  getAll: async (): Promise<Subscription[]> => {
    const res = await fetch(BASE_URL, { headers: await authHeaders() });
    if (!res.ok) return parseError(res, "Failed to load subscriptions");
    const data = await res.json();
    return (data.subscriptions as WireSubscription[]).map(fromWire);
  },

  create: async (subscription: Omit<Subscription, "id" | "createdAt">): Promise<Subscription> => {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(toWirePayload(subscription)),
    });
    if (!res.ok) return parseError(res, "Failed to create subscription");
    return fromWire(await res.json());
  },

  update: async (subscription: Subscription): Promise<Subscription> => {
    const res = await fetch(BASE_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({
        ...toWirePayload(subscription),
        subscriptionId: subscription.id,
      }),
    });
    if (!res.ok) return parseError(res, "Failed to update subscription");
    return fromWire(await res.json());
  },

  delete: async (id: string): Promise<void> => {
    const params = new URLSearchParams({ subscriptionId: id });
    const res = await fetch(`${BASE_URL}?${params.toString()}`, {
      method: "DELETE",
      headers: await authHeaders(),
    });
    if (!res.ok) return parseError(res, "Failed to delete subscription");
  },
};
