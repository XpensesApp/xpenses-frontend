"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubscriptionsStore } from "@/store/subscriptions.store";
import { Subscription } from "@/features/subscriptions/subscriptions.types";
import { TransactionType } from "@/features/transactions/transactions.types";

type CreateProps = {
  mode: "create";
};

type EditProps = {
  mode: "edit";
  subscription: Subscription;
};

type Props = (CreateProps | EditProps) & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function SubscriptionDialog(props: Props) {
  const { open, onOpenChange, onSaved } = props;

  const addSubscription = useSubscriptionsStore(state => state.addSubscription);
  const updateSubscription = useSubscriptionsStore(state => state.updateSubscription);
  const deleteSubscription = useSubscriptionsStore(state => state.deleteSubscription);

  const [type, setType] = useState<TransactionType>("expense");
  const [title, setTitle] = useState("");
  const [hasFixedAmount, setHasFixedAmount] = useState(true);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [billingDay, setBillingDay] = useState("");
  const [affectsBalance, setAffectsBalance] = useState(true);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  const canDelete = props.mode === "edit" && props.subscription.status === "paused";

  function handleOpenAutoFocus(e: Event) {
    e.preventDefault();

    if (props.mode === "edit") {
      const s = props.subscription;
      setType(s.type);
      setTitle(s.title);
      setHasFixedAmount(s.amount != null);
      setAmount(s.amount != null ? String(s.amount) : "");
      setCategory(s.category);
      setBillingDay(String(s.billingDay));
      setAffectsBalance(s.affectsBalance);
      setHasEndDate(!!s.endDate);
      setEndDate(s.endDate ?? "");
    } else {
      setType("expense");
      setTitle("");
      setHasFixedAmount(true);
      setAmount("");
      setCategory("");
      setBillingDay(String(new Date().getDate()));
      setAffectsBalance(true);
      setHasEndDate(false);
      setEndDate("");
    }

    setError(null);
    setConfirmingDelete(false);
    titleRef.current?.focus();
  }

  async function handleSave() {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("El nombre es obligatorio.");
      return;
    }

    const parsedDay = Number(billingDay);
    if (!billingDay || !Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      setError("El día de facturación debe ser un número entre 1 y 31.");
      return;
    }

    let parsedAmount: number | undefined;
    if (hasFixedAmount) {
      parsedAmount = Number(amount);
      if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setError("Ingresa un monto válido.");
        return;
      }
    }

    if (hasEndDate && !endDate) {
      setError("Selecciona una fecha de término.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (props.mode === "edit") {
        await updateSubscription({
          ...props.subscription,
          type,
          title: trimmedTitle,
          amount: parsedAmount,
          category: category.trim(),
          billingDay: parsedDay,
          affectsBalance,
          endDate: hasEndDate ? endDate : undefined,
        });
      } else {
        await addSubscription({
          type,
          title: trimmedTitle,
          amount: parsedAmount,
          category: category.trim(),
          billingDay: parsedDay,
          affectsBalance,
          status: "active",
          endDate: hasEndDate ? endDate : undefined,
        });
      }

      onOpenChange(false);
      onSaved?.();
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (props.mode !== "edit") return;

    setDeleting(true);
    setError(null);

    try {
      await deleteSubscription(props.subscription.id);
      onOpenChange(false);
      onSaved?.();
    } catch {
      setError("No se pudo eliminar. Intenta de nuevo.");
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={handleOpenAutoFocus}>
        <DialogHeader>
          <DialogTitle>
            {props.mode === "edit" ? "Editar suscripción" : "Nueva suscripción"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === "expense" ? "default" : "outline"}
                size="sm"
                onClick={() => setType("expense")}
              >
                Gasto
              </Button>
              <Button
                type="button"
                variant={type === "income" ? "default" : "outline"}
                size="sm"
                onClick={() => setType("income")}
              >
                Ingreso
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre</label>
            <Input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ej. Netflix"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Monto</label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={hasFixedAmount ? "default" : "outline"}
                size="sm"
                onClick={() => setHasFixedAmount(true)}
              >
                Fijo
              </Button>
              <Button
                type="button"
                variant={!hasFixedAmount ? "default" : "outline"}
                size="sm"
                onClick={() => setHasFixedAmount(false)}
              >
                Variable
              </Button>
              {hasFixedAmount ? (
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="decimal"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-40 pl-6"
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Ingresarás el monto cada vez que pagues.
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Categoría (opcional)</label>
            <Input value={category} onChange={e => setCategory(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Día de facturación</label>
            <Input
              type="number"
              min="1"
              max="31"
              step="1"
              inputMode="numeric"
              value={billingDay}
              onChange={e => setBillingDay(e.target.value)}
              className="w-24"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Afecta el balance</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={affectsBalance ? "default" : "outline"}
                size="sm"
                onClick={() => setAffectsBalance(true)}
              >
                Sí
              </Button>
              <Button
                type="button"
                variant={!affectsBalance ? "default" : "outline"}
                size="sm"
                onClick={() => setAffectsBalance(false)}
              >
                No, es solo referencial
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Fecha de término</label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={!hasEndDate ? "default" : "outline"}
                size="sm"
                onClick={() => setHasEndDate(false)}
              >
                Sin término
              </Button>
              <Button
                type="button"
                variant={hasEndDate ? "default" : "outline"}
                size="sm"
                onClick={() => setHasEndDate(true)}
              >
                Con término
              </Button>
              {hasEndDate && (
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-44 [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:invert"
                />
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className={props.mode === "edit" ? "sm:justify-between" : undefined}>
          {props.mode === "edit" && (
            confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  ¿Eliminar esta suscripción?
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Eliminando..." : "Confirmar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                >
                  Cancelar
                </Button>
              </div>
            ) : canDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setConfirmingDelete(true)}
              >
                Eliminar
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Pausa la suscripción para poder eliminarla.
              </span>
            )
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
