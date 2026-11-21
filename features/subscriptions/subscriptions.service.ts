import { getCurrentAuthToken, forceReauth } from "@/lib/current-auth-token";
import { Subscription, SubscriptionStatus } from "./subscriptions.types";
import { TransactionType } from "@/features/transactions/transactions.types";

const BASE_URL = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_API_BASE_URL!;

// The backend's status values ("active"/"disabled") differ from the
// frontend's own ("active"/"paused") — the UI, its labels, and the
// pause/resume icons are all built around "paused", so that's kept as the
// frontend's internal vocabulary and adapted here at the wire boundary,
// rather than renaming it.
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
  billingDay: number | string;
  type: TransactionType;
  affectsBalance: boolean;
  status: WireStatus;
  subscriptionId: string;
  amount: string | null;
  categories: string[];
  createdAt: string;
  endDate: string | null;
};

// The minimum a response needs to be taken for a subscription at all: without
// an id and a title there's nothing sensible to show or to edit later.
function isSubscriptionWire(value: unknown): value is WireSubscription {
  if (typeof value !== "object" || value === null) return false;
  const wire = value as Partial<WireSubscription>;
  return typeof wire.subscriptionId === "string" && typeof wire.title === "string";
}

function fromWire(wire: WireSubscription): Subscription {
  return {
    id: wire.subscriptionId,
    title: wire.title,
    amount: wire.amount != null ? Number(wire.amount) : undefined,
    // Defaulted so a response that leaves the field out (e.g. a PUT echo) can't
    // put `undefined` in the store, where the cards and the dialog read it.
    categories: wire.categories ?? [],
    // Can arrive as a string ("26") — the backend serializes its stored numbers
    // that way in places, like the decimal-string `amount` — yet its PUT
    // validation insists on an integer ("Expected `int`, got `str`"). Pausing
    // re-sends the stored value as-is, so it has to be a number by now.
    billingDay: Number(wire.billingDay),
    type: wire.type,
    affectsBalance: wire.affectsBalance,
    status: STATUS_FROM_WIRE[wire.status] ?? "active",
    createdAt: wire.createdAt,
    endDate: wire.endDate ?? undefined,
  };
}

// subscriptionId/createdAt are server-generated on create, so this payload
// shape covers both create and update — update adds the two on top of it.
function toWirePayload(subscription: Omit<Subscription, "id" | "createdAt">) {
  return {
    title: subscription.title,
    billingDay: subscription.billingDay,
    type: subscription.type,
    affectsBalance: subscription.affectsBalance,
    status: STATUS_TO_WIRE[subscription.status],
    amount: subscription.amount != null ? String(subscription.amount) : null,
    categories: subscription.categories,
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
  const error = new Error(body?.message ?? fallback) as Error & { status?: number };
  error.status = res.status;
  throw error;
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
        // The backend keeps the stored createdAt on its own since its #34 (it
        // ignores this one), so this is redundant. Still sent so an older
        // deployment, which filled in "now" for a missing createdAt, can't
        // reset it on every edit or pause and push the subscription to the top
        // of the newest-first list.
        createdAt: subscription.createdAt,
      }),
    });
    if (!res.ok) return parseError(res, "Failed to update subscription");

    // The PUT is a full replace and it succeeded, so what was sent is what is
    // stored. If the body that came back isn't a subscription (a bare message,
    // a wrapper object…), keep what was sent rather than let a title-less,
    // id-less object replace the real one in the store — the cards and the
    // edit dialog read those fields.
    const body: unknown = await res.json().catch(() => null);
    if (!isSubscriptionWire(body)) {
      console.warn("PUT /subscriptions answered 200 with an unexpected body; keeping the data that was sent:", body);
      return subscription;
    }
    return fromWire(body);
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
