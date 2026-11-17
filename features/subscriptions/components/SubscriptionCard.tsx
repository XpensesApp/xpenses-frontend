"use client";

import { useState } from "react";
import { PauseIcon, PencilIcon, PlayIcon, WalletIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
      setToggleError(`No se pudo ${isPaused ? "reanudar" : "pausar"} la suscripción. Intenta de nuevo.`);
    } finally {
      setToggling(false);
    }
  }

  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-3 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-medium">{subscription.title}</span>
            {subscription.category && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {subscription.category}
              </span>
            )}
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
