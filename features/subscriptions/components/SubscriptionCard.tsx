"use client";

import { useState } from "react";
import { PauseIcon, PencilIcon, PlayIcon, WalletIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryLabels } from "@/components/CategoryLabels";
import { cn, errorMessage, errorStatus } from "@/lib/utils";
import { useSubscriptionsStore } from "@/store/subscriptions.store";
import { TransactionDialog } from "@/features/transactions/components/TransactionDialog";
import { Subscription } from "../subscriptions.types";
import { SubscriptionDialog } from "./SubscriptionDialog";

type Props = {
  subscription: Subscription;
};

export function SubscriptionCard({ subscription }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const toggleSubscriptionStatus = useSubscriptionsStore(state => state.toggleSubscriptionStatus);
  const loadSubscriptions = useSubscriptionsStore(state => state.loadSubscriptions);

  const isPaused = subscription.status === "paused";
  const hasEnded = !!subscription.endDate && subscription.endDate < todayISODate();
  const statusLabel = isPaused ? "Pausada" : hasEnded ? "Finalizada" : "Activa";

  // Awaited (and guarded against a second click while in flight) so a failed
  // pause/resume shows up instead of silently leaving the card as it was.
  async function handleToggleStatus() {
    setToggling(true);
    setToggleError(null);
    try {
      await toggleSubscriptionStatus(subscription.id);
    } catch (error) {
      console.error("Could not change the subscription's status:", error);
      // The backend's own reason, when it gives one, so a rejection can be told
      // apart from a network failure instead of every failure reading the same.
      setToggleError(
        `No se pudo ${isPaused ? "reanudar" : "pausar"} la suscripción: ${errorMessage(error, "intenta de nuevo.")}`
      );
      // Gone from the backend (deleted from another tab or device): resync the list.
      if (errorStatus(error) === 404) loadSubscriptions().catch(() => {});
    } finally {
      setToggling(false);
    }
  }

  return (
    <Card className="py-0">
      {/* flex-wrap: on a narrow screen the three action buttons drop to their
          own row (right-aligned) instead of squeezing the title to nothing. */}
      <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
        <div className="min-w-0 flex-1 basis-48">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="min-w-0 truncate font-medium">{subscription.title}</span>
            <CategoryLabels categories={subscription.categories} />
            <span
              className={cn(
                "shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none",
                isPaused
                  ? "text-amber-600 dark:text-amber-400"
                  : hasEnded
                    ? "text-muted-foreground"
                    : "text-income"
              )}
            >
              {statusLabel}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Se factura el día {subscription.billingDay} de cada mes
            {subscription.endDate ? ` · hasta ${subscription.endDate}` : ""}
            {isPaused ? " · no genera cobros mientras esté pausada" : ""}
          </span>
          {toggleError && <p className="text-xs text-destructive">{toggleError}</p>}
        </div>

        <span className="shrink-0 font-medium tabular-nums">
          {subscription.amount != null
            ? `$${subscription.amount.toLocaleString()}`
            : "Variable"}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Registrar pago"
            title="Registrar pago"
            onClick={() => setPaymentOpen(true)}
          >
            <WalletIcon />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={isPaused ? "Reanudar suscripción" : "Pausar suscripción"}
            title={isPaused ? "Reanudar suscripción" : "Pausar suscripción"}
            disabled={toggling}
            onClick={handleToggleStatus}
          >
            {isPaused ? <PlayIcon /> : <PauseIcon />}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Editar suscripción"
            onClick={() => setEditOpen(true)}
          >
            <PencilIcon />
          </Button>
        </div>
      </CardContent>

      <SubscriptionDialog
        mode="edit"
        subscription={subscription}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <TransactionDialog
        mode="create"
        subscription={subscription}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
      />
    </Card>
  );
}

function todayISODate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}
