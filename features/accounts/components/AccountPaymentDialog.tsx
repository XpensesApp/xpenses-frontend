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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccountsStore } from "@/store/accounts.store";
import { Account } from "@/features/accounts/accounts.types";

const NO_SOURCE = "none";

type Props = {
  account: Account | null;
  /** Amount currently due on this card (this cycle or earlier) — the cap for both a full and a partial payment. */
  amountDue: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmPayment: (amount: number, sourceAccountId: string | undefined) => Promise<void>;
};

export function AccountPaymentDialog({
  account,
  amountDue,
  open,
  onOpenChange,
  onConfirmPayment,
}: Props) {
  const accounts = useAccountsStore(state => state.accounts);
  const sourceOptions = accounts.filter(a => a.type !== "credit");

  const [mode, setMode] = useState<"idle" | "partial">("idle");
  const [partialAmount, setPartialAmount] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState(
    () => sourceOptions.find(a => a.isDefault)?.id ?? NO_SOURCE
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(amount: number) {
    setSubmitting(true);
    setError(null);

    try {
      await onConfirmPayment(
        amount,
        sourceAccountId === NO_SOURCE ? undefined : sourceAccountId
      );
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
          <DialogTitle>Pagar cuenta</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Tienes{" "}
          <span className="font-medium text-foreground">
            ${amountDue.toLocaleString()}
          </span>{" "}
          facturado y sin pagar en{" "}
          <span className="font-medium text-foreground">{account?.name}</span>.
          ¿Cuánto quieres pagar?
        </p>

        <div className="space-y-1">
          <label className="text-sm font-medium">Cuenta de origen</label>
          <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SOURCE}>Sin cuenta</SelectItem>
              {sourceOptions.map(source => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
            Cancelar
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
                Monto personalizado
              </Button>
              <Button
                type="button"
                onClick={() => handleConfirm(amountDue)}
                disabled={submitting}
              >
                {submitting ? "Guardando..." : "Pagar todo lo facturado"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
