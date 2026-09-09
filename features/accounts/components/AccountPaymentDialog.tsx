"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Account } from "@/features/accounts/accounts.types";

type Props = {
  /** "reminder": the automatic past-due-day prompt, scoped to this cycle's billed amount. "manual": the accounts-section action, scoped to the full outstanding balance. */
  variant: "reminder" | "manual";
  account: Account | null;
  amountDue: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmPayment: (amount: number) => Promise<void>;
};

export function AccountPaymentDialog({
  variant,
  account,
  amountDue,
  open,
  onOpenChange,
  onConfirmPayment,
}: Props) {
  const [mode, setMode] = useState<"idle" | "partial">("idle");
  const [partialAmount, setPartialAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReminder = variant === "reminder";

  async function handleConfirm(amount: number) {
    setSubmitting(true);
    setError(null);

    try {
      await onConfirmPayment(amount);
      onOpenChange(false);
    } catch {
      setError("No se pudo registrar el pago. Intenta de nuevo.");
      setSubmitting(false);
    }
  }

  function handlePartialConfirm() {
    const parsed = Number(partialAmount);

    if (!partialAmount || !Number.isFinite(parsed) || parsed <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }

    if (parsed > amountDue) {
      setError(`El monto no puede ser mayor a $${amountDue.toLocaleString()}.`);
      return;
    }

    handleConfirm(parsed);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isReminder ? "Recordatorio de pago" : "Pagar cuenta"}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {isReminder ? (
            <>
              Ya pasó el día de pago de{" "}
              <span className="font-medium text-foreground">{account?.name}</span>
              . Tienes{" "}
              <span className="font-medium text-foreground">
                ${amountDue.toLocaleString()}
              </span>{" "}
              vencido este mes (la suma de las cuotas que ya se facturaron). ¿Ya lo
              pagaste?
            </>
          ) : (
            <>
              Tienes{" "}
              <span className="font-medium text-foreground">
                ${amountDue.toLocaleString()}
              </span>{" "}
              de deuda total en{" "}
              <span className="font-medium text-foreground">{account?.name}</span>{" "}
              (incluyendo cuotas que aún no se facturan). ¿Cuánto quieres pagar?
            </>
          )}
        </p>

        {mode === "partial" && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Monto a pagar</label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                value={partialAmount}
                onChange={e => setPartialAmount(e.target.value)}
                className="pl-6"
                autoFocus
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {isReminder ? "Todavía no" : "Cancelar"}
          </Button>

          {mode === "partial" ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("idle")}
                disabled={submitting}
              >
                Volver
              </Button>
              <Button
                type="button"
                onClick={handlePartialConfirm}
                disabled={submitting}
              >
                {submitting ? "Guardando..." : "Confirmar pago"}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("partial")}
                disabled={submitting}
              >
                {isReminder ? "Pago parcial" : "Monto personalizado"}
              </Button>
              <Button
                type="button"
                onClick={() => handleConfirm(amountDue)}
                disabled={submitting}
              >
                {submitting
                  ? "Guardando..."
                  : isReminder
                    ? "Sí, pago completo"
                    : "Pagar deuda completa"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
