"use client";

import { useState } from "react";
import { PauseIcon, PencilIcon, PlayIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubscriptionsStore } from "@/store/subscriptions.store";
import { Subscription } from "../subscriptions.types";
import { SubscriptionDialog } from "./SubscriptionDialog";

type Props = {
  subscription: Subscription;
};

export function SubscriptionCard({ subscription }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const toggleSubscriptionStatus = useSubscriptionsStore(state => state.toggleSubscriptionStatus);

  const isPaused = subscription.status === "paused";
  const hasEnded = !!subscription.endDate && subscription.endDate < todayISODate();
  const statusLabel = isPaused ? "Pausada" : hasEnded ? "Finalizada" : "Activa";

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
                isPaused || hasEnded ? "text-muted-foreground" : "text-income"
              )}
            >
              {statusLabel}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Se factura el día {subscription.billingDay} de cada mes
            {subscription.endDate ? ` · hasta ${subscription.endDate}` : ""}
          </span>
        </div>

        <span className="shrink-0 font-medium tabular-nums">
          {subscription.amount != null
            ? `$${subscription.amount.toLocaleString()}`
            : "Variable"}
        </span>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={isPaused ? "Reanudar suscripción" : "Pausar suscripción"}
          onClick={() => toggleSubscriptionStatus(subscription.id)}
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
    </Card>
  );
}

function todayISODate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}
