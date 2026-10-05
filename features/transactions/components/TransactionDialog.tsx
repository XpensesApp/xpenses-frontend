"use client";

import { useRef, useState } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/MoneyInput";
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
import { useTransactionsStore } from "@/store/transactions.store";
import { useAccountsStore } from "@/store/accounts.store";
import { Transaction, TransactionType } from "@/features/transactions/transactions.types";
import { nowLocalDateTime, toDateTimeLocalValue } from "@/lib/dates";
import { errorMessage, errorStatus } from "@/lib/utils";

const NO_ACCOUNT = "none";

type CreateProps = {
  mode: "create";
  initialTitle?: string;
  /** Pre-selects the type when the dialog opens — e.g. the Accounts page's "Transferir" button opens straight into transfer mode instead of making the user switch to it. Defaults to "expense". */
  initialType?: TransactionType;
};

type EditProps = {
  mode: "edit";
  transaction: Transaction;
};

type Props = (CreateProps | EditProps) & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function TransactionDialog(props: Props) {
  const { open, onOpenChange, onSaved } = props;

  const addTransaction = useTransactionsStore(state => state.addTransaction);
  const updateTransaction = useTransactionsStore(state => state.updateTransaction);
  const deleteTransaction = useTransactionsStore(state => state.deleteTransaction);
  const loadTransactions = useTransactionsStore(state => state.loadTransactions);
  const accounts = useAccountsStore(state => state.accounts);

  const [type, setType] = useState<TransactionType>("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState("");
  const [date, setDate] = useState(nowLocalDateTime());
  const [affectsBalance, setAffectsBalance] = useState(true);
  const [accountId, setAccountId] = useState(NO_ACCOUNT);
  const [targetAccountId, setTargetAccountId] = useState(NO_ACCOUNT);
  const [useInstallments, setUseInstallments] = useState(false);
  const [installments, setInstallments] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find(a => a.id === accountId);
  const isCreditSelected = selectedAccount?.type === "credit";
  const isPaying = props.mode === "edit" && props.transaction.pending;
  const installmentsApply = isCreditSelected && type === "expense";
  const isTransfer = type === "transfer";
  // Credit accounts track debt, not spendable money — paying/charging one
  // already has its own dedicated flow (AccountPaymentDialog), so they're
  // excluded here rather than half-supporting a transfer that wouldn't
  // actually move the card's debt.
  const transferableAccounts = accounts.filter(a => a.type !== "credit");

  function addCategory(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setCategories(prev => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setCategoryInput("");
  }

  function removeCategory(value: string) {
    setCategories(prev => prev.filter(c => c !== value));
  }

  function handleOpenAutoFocus(e: Event) {
    e.preventDefault();

    if (props.mode === "edit") {
      const transaction = props.transaction;
      setType(transaction.type);
      setTitle(transaction.title);
      setAmount(transaction.amount === 0 && isPaying ? "" : String(transaction.amount));
      setCategories(transaction.categories);
      setCategoryInput("");
      setDate(isPaying ? nowLocalDateTime() : toDateTimeLocalValue(transaction.date));
      setAffectsBalance(transaction.affectsBalance);
      setAccountId(
        isPaying
          ? accounts.find(a => a.isDefault)?.id ?? NO_ACCOUNT
          : transaction.accountId ?? NO_ACCOUNT
      );
      setTargetAccountId(transaction.targetAccountId ?? NO_ACCOUNT);
      setUseInstallments(!!transaction.installments);
      setInstallments(transaction.installments ? String(transaction.installments) : "");
    } else {
      setType(props.initialType ?? "expense");
      setTitle(props.initialTitle?.trim() ?? "");
      setAmount("");
      setCategories([]);
      setCategoryInput("");
      setDate(nowLocalDateTime());
      setAffectsBalance(true);
      setAccountId(accounts.find(a => a.isDefault)?.id ?? NO_ACCOUNT);
      setTargetAccountId(NO_ACCOUNT);
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
      installmentsApply &&
      useInstallments &&
      (!Number.isInteger(parsedInstallments) || parsedInstallments! < 2)
    ) {
      setError("La cantidad de cuotas debe ser un número entero mayor o igual a 2.");
      return;
    }

    if (isTransfer) {
      if (accountId === NO_ACCOUNT) {
        setError("Selecciona una cuenta de origen.");
        return;
      }
      if (targetAccountId === NO_ACCOUNT) {
        setError("Selecciona una cuenta de destino.");
        return;
      }
      if (accountId === targetAccountId) {
        setError("La cuenta de origen y destino deben ser diferentes.");
        return;
      }
    }

    const accountUnchanged =
      props.mode === "edit" &&
      !isPaying &&
      accountId === (props.transaction.accountId ?? NO_ACCOUNT);

    if (!isTransfer && !accountUnchanged && isCreditSelected && selectedAccount?.paymentDay == null) {
      setError("Esta tarjeta no tiene día de pago configurado. Edítala en Cuentas antes de usarla.");
      return;
    }

    const resolvedAccountId = accountId === NO_ACCOUNT ? undefined : accountId;
    const resolvedTargetAccountId =
      isTransfer && targetAccountId !== NO_ACCOUNT ? targetAccountId : undefined;
    const resolvedInstallments =
      installmentsApply && useInstallments ? parsedInstallments : undefined;
    const pendingCategory = categoryInput.trim();
    const resolvedCategories = isTransfer
      ? []
      : pendingCategory && !categories.includes(pendingCategory)
        ? [...categories, pendingCategory]
        : categories;

    let resolvedPaymentDay: number | undefined;
    if (isTransfer) {
      resolvedPaymentDay = undefined;
    } else if (props.mode === "edit" && accountUnchanged) {
      resolvedPaymentDay = props.transaction.paymentDay;
    } else {
      resolvedPaymentDay = isCreditSelected ? selectedAccount?.paymentDay : undefined;
    }

    setSaving(true);
    setError(null);

    try {
      if (props.mode === "edit") {
        await updateTransaction({
          ...props.transaction,
          type,
          title: trimmedTitle,
          amount: parsedAmount,
          categories: resolvedCategories,
          date,
          affectsBalance,
          accountId: resolvedAccountId,
          targetAccountId: resolvedTargetAccountId,
          installments: resolvedInstallments,
          paymentDay: resolvedPaymentDay,
          pending: false,
        });
      } else {
        await addTransaction({
          type,
          title: trimmedTitle,
          amount: parsedAmount,
          categories: resolvedCategories,
          date,
          affectsBalance,
          accountId: resolvedAccountId,
          targetAccountId: resolvedTargetAccountId,
          installments: resolvedInstallments,
          paymentDay: resolvedPaymentDay,
          pending: false,
        });
      }

      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      setError(errorMessage(error, "No se pudo guardar. Intenta de nuevo."));
      // A 409 means this transaction was changed/deleted elsewhere since it
      // was loaded — refresh so the next save attempt starts from current data.
      if (errorStatus(error) === 409) loadTransactions();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (props.mode !== "edit") return;

    setDeleting(true);
    setError(null);

    try {
      await deleteTransaction(props.transaction.id, props.transaction.date);
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      setError(errorMessage(error, "No se pudo eliminar. Intenta de nuevo."));
      if (errorStatus(error) === 409) loadTransactions();
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
                : isTransfer
                  ? "Editar transferencia"
                  : "Editar movimiento"
              : isTransfer
                ? "Nueva transferencia"
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
                onClick={() => setType("income")}
              >
                Ingreso
              </Button>
              <Button
                type="button"
                variant={type === "transfer" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setType("transfer");
                  // A credit account can't be a transfer's source (it tracks
                  // debt, not spendable money) — clear it rather than leave a
                  // now-invalid, hidden-from-the-dropdown selection in place.
                  if (isCreditSelected) {
                    setAccountId(NO_ACCOUNT);
                    setUseInstallments(false);
                    setInstallments("");
                  }
                }}
              >
                Transferencia
              </Button>
            </div>
            {isCreditSelected && type === "income" && (
              <p className="text-xs text-muted-foreground">
                Se registrará como un reembolso que reduce la deuda de la tarjeta.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Precio</label>
            <MoneyInput
              ref={amountRef}
              value={amount}
              onChange={setAmount}
              onKeyDown={e => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>

          {!isTransfer && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Categorías (opcional)</label>
              <Input
                value={categoryInput}
                onChange={e => setCategoryInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addCategory(categoryInput);
                  }
                }}
                placeholder="Escribe y presiona Enter"
              />
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {categories.map(cat => (
                    <span
                      key={cat}
                      className="flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {cat}
                      <button
                        type="button"
                        onClick={() => removeCategory(cat)}
                        aria-label={`Quitar categoría ${cat}`}
                        className="hover:text-foreground"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

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
            <label className="text-sm font-medium">
              {isTransfer ? "Cuenta origen" : "Cuenta (opcional)"}
            </label>
            <Select
              value={accountId}
              onValueChange={value => {
                setAccountId(value);
                setUseInstallments(false);
                setInstallments("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {!isTransfer && <SelectItem value={NO_ACCOUNT}>Sin cuenta</SelectItem>}
                {(isTransfer ? transferableAccounts : accounts).map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isTransfer && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Cuenta destino</label>
              <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {transferableAccounts
                    .filter(account => account.id !== accountId)
                    .map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {installmentsApply && (
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
