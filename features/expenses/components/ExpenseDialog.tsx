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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExpensesStore } from "@/store/expenses.store";
import { useAccountsStore } from "@/store/accounts.store";
import { Expense, ExpenseType } from "@/features/expenses/expenses.types";

const NO_ACCOUNT = "none";

function nowLocalDateTime() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toDateTimeLocalValue(date: string) {
  return date.length === 10 ? `${date}T00:00` : date.slice(0, 16);
}

type CreateProps = {
  mode: "create";
  initialTitle?: string;
};

type EditProps = {
  mode: "edit";
  expense: Expense;
};

type Props = (CreateProps | EditProps) & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function ExpenseDialog(props: Props) {
  const { open, onOpenChange, onSaved } = props;

  const addExpense = useExpensesStore(state => state.addExpense);
  const updateExpense = useExpensesStore(state => state.updateExpense);
  const deleteExpense = useExpensesStore(state => state.deleteExpense);
  const accounts = useAccountsStore(state => state.accounts);

  const [type, setType] = useState<ExpenseType>("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(nowLocalDateTime());
  const [affectsBalance, setAffectsBalance] = useState(true);
  const [accountId, setAccountId] = useState(NO_ACCOUNT);
  const [useInstallments, setUseInstallments] = useState(false);
  const [installments, setInstallments] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find(a => a.id === accountId);
  const isCreditSelected = selectedAccount?.type === "credit";
  const isPaying = props.mode === "edit" && props.expense.pending;

  function handleOpenAutoFocus(e: Event) {
    e.preventDefault();

    if (props.mode === "edit") {
      const expense = props.expense;
      setType(expense.type);
      setTitle(expense.title);
      setAmount(expense.amount === 0 && isPaying ? "" : String(expense.amount));
      setCategory(expense.category);
      setDate(isPaying ? nowLocalDateTime() : toDateTimeLocalValue(expense.date));
      setAffectsBalance(expense.affectsBalance);
      setAccountId(
        isPaying
          ? accounts.find(a => a.isDefault)?.id ?? NO_ACCOUNT
          : expense.accountId ?? NO_ACCOUNT
      );
      setUseInstallments(!!expense.installments);
      setInstallments(expense.installments ? String(expense.installments) : "");
    } else {
      setType("expense");
      setTitle(props.initialTitle?.trim() ?? "");
      setAmount("");
      setCategory("");
      setDate(nowLocalDateTime());
      setAffectsBalance(true);
      setAccountId(accounts.find(a => a.isDefault)?.id ?? NO_ACCOUNT);
      setUseInstallments(false);
      setInstallments("");
    }

    setError(null);
    setConfirmingDelete(false);
    amountRef.current?.focus();
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    const parsedAmount = Number(amount);

    if (!trimmedTitle) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Ingresa un precio válido.");
      return;
    }

    const parsedInstallments = installments ? Number(installments) : undefined;

    if (
      isCreditSelected &&
      useInstallments &&
      (!Number.isInteger(parsedInstallments) || parsedInstallments! < 2)
    ) {
      setError("La cantidad de cuotas debe ser un número entero mayor o igual a 2.");
      return;
    }

    const accountUnchanged =
      props.mode === "edit" &&
      !isPaying &&
      accountId === (props.expense.accountId ?? NO_ACCOUNT);

    if (!accountUnchanged && isCreditSelected && selectedAccount?.paymentDay == null) {
      setError("Esta tarjeta no tiene día de pago configurado. Edítala en Cuentas antes de usarla.");
      return;
    }

    const resolvedAccountId = accountId === NO_ACCOUNT ? undefined : accountId;
    const resolvedInstallments =
      isCreditSelected && useInstallments ? parsedInstallments : undefined;

    let resolvedPaymentDay: number | undefined;
    if (props.mode === "edit" && accountUnchanged) {
      resolvedPaymentDay = props.expense.paymentDay;
    } else {
      resolvedPaymentDay = isCreditSelected ? selectedAccount?.paymentDay : undefined;
    }

    setSaving(true);
    setError(null);

    try {
      if (props.mode === "edit") {
        await updateExpense({
          ...props.expense,
          type,
          title: trimmedTitle,
          amount: parsedAmount,
          category: category.trim(),
          date,
          affectsBalance,
          accountId: resolvedAccountId,
          installments: resolvedInstallments,
          paymentDay: resolvedPaymentDay,
          pending: false,
        });
      } else {
        await addExpense({
          id: crypto.randomUUID(),
          type,
          title: trimmedTitle,
          amount: parsedAmount,
          category: category.trim(),
          date,
          affectsBalance,
          accountId: resolvedAccountId,
          installments: resolvedInstallments,
          paymentDay: resolvedPaymentDay,
          pending: false,
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
      await deleteExpense(props.expense.id);
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
            {props.mode === "edit"
              ? isPaying
                ? "Pagar suscripción"
                : "Editar movimiento"
              : "Nuevo movimiento"}
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
                disabled={isCreditSelected}
                onClick={() => setType("income")}
              >
                Ingreso
              </Button>
            </div>
            {isCreditSelected && (
              <p className="text-xs text-muted-foreground">
                Los movimientos con tarjeta de crédito son siempre gastos.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Precio</label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                ref={amountRef}
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleSave();
                }}
                className="pl-6 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:[-webkit-appearance:none] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:[-webkit-appearance:none]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Categoría (opcional)</label>
            <Input
              value={category}
              onChange={e => setCategory(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Fecha y hora</label>
            <Input
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="[&::-webkit-calendar-picker-indicator]:size-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:invert"
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
            <label className="text-sm font-medium">Cuenta (opcional)</label>
            <Select
              value={accountId}
              onValueChange={value => {
                setAccountId(value);
                setUseInstallments(false);
                setInstallments("");
                if (accounts.find(a => a.id === value)?.type === "credit") {
                  setType("expense");
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ACCOUNT}>Sin cuenta</SelectItem>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCreditSelected && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Pagar en cuotas</label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={!useInstallments ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseInstallments(false)}
                >
                  No
                </Button>
                <Button
                  type="button"
                  variant={useInstallments ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseInstallments(true)}
                >
                  Sí
                </Button>
                {useInstallments && (
                  <Input
                    type="number"
                    min="2"
                    step="1"
                    inputMode="numeric"
                    placeholder="Cantidad de cuotas"
                    value={installments}
                    onChange={e => setInstallments(e.target.value)}
                    className="w-40"
                  />
                )}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className={props.mode === "edit" ? "sm:justify-between" : undefined}>
          {props.mode === "edit" && (
            confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  ¿Eliminar este movimiento?
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
            ) : (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setConfirmingDelete(true)}
              >
                Eliminar
              </Button>
            )
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : isPaying ? "Pagar" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
