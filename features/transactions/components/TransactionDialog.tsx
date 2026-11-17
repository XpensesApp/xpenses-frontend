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
import { useSubscriptionsStore } from "@/store/subscriptions.store";
import { Transaction, TransactionType } from "@/features/transactions/transactions.types";
import { Subscription } from "@/features/subscriptions/subscriptions.types";
import { nowLocalDateTime, transactionDateTimeLocalValue } from "@/lib/dates";
import { errorMessage, errorStatus } from "@/lib/utils";

const NO_ACCOUNT = "none";
const NO_SUBSCRIPTION = "none";

type CreateProps = {
  mode: "create";
  initialTitle?: string;
  /** Pre-selects the type when the dialog opens — e.g. the Accounts page's "Transferir" button opens straight into transfer mode instead of making the user switch to it. Defaults to "expense". */
  initialType?: TransactionType;
  /** Opens the dialog as a manual payment of this subscription: prefilled from it, linked to it, and starting as pending ("Por pagar") like the entries the daily job generates. */
  subscription?: Subscription;
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
  const subscriptions = useSubscriptionsStore(state => state.subscriptions);
  const loadSubscriptions = useSubscriptionsStore(state => state.loadSubscriptions);

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
  const [subscriptionId, setSubscriptionId] = useState(NO_SUBSCRIPTION);
  // Only a manual subscription payment starts (and can stay) pending; every
  // other entry made here is saved as paid, as before.
  const [pending, setPending] = useState(false);
  // True once a subscriptions load triggered from here succeeded — tells "not
  // loaded yet" apart from "that subscription is really gone" for the picker.
  const [subscriptionsLoaded, setSubscriptionsLoaded] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find(a => a.id === accountId);
  const isCreditSelected = selectedAccount?.type === "credit";
  const preferredAccountId = accounts.find(a => a.isPreferred)?.id;
  const isPaying = props.mode === "edit" && props.transaction.pending;
  const statement = props.mode === "edit" ? props.transaction.statement : undefined;
  const isStatement = !!statement;
  const statementAccount = statement ? accounts.find(a => a.id === statement.accountId) : undefined;
  // A pending payment hasn't been confirmed yet, so there's no purchase to
  // split into cuotas until it's paid.
  const installmentsApply = isCreditSelected && type === "expense" && !pending;
  const isTransfer = type === "transfer";
  const isSubscriptionPayment = props.mode === "create" && !!props.subscription;
  const subscriptionsKnown = subscriptions.length > 0 || subscriptionsLoaded;
  // The entry points at a subscription that's no longer in the list (deleted).
  // Its id is still kept and resent unless the user picks something else —
  // the backend accepts an unchanged link even to a deleted subscription.
  const linkedSubscriptionMissing =
    subscriptionId !== NO_SUBSCRIPTION && !subscriptions.some(s => s.id === subscriptionId);
  // A credit card can't be a transfer's source — it tracks debt, not
  // spendable money, so there's nothing to move "from" it. It CAN be a
  // destination (paying a card down), including the card's own
  // auto-generated statement above.
  const transferSourceAccounts = accounts.filter(a => a.type !== "credit");
  const transferDestinationAccounts = accounts.filter(a => a.id !== accountId);

  function addCategory(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setCategories(prev => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setCategoryInput("");
  }

  function removeCategory(value: string) {
    setCategories(prev => prev.filter(c => c !== value));
  }

  // Picking a subscription for a NEW entry starts it from that subscription's
  // own data (still editable afterwards), so recording its payment doesn't mean
  // retyping everything. What the subscription doesn't define is left as the
  // user had it: a variable amount, no category. Editing an existing entry only
  // changes the link — its own data isn't overwritten. Subscriptions have no
  // account or date, so those stay as they are too.
  function handleSubscriptionChange(value: string) {
    setSubscriptionId(value);

    if (props.mode !== "create") return;
    const subscription = subscriptions.find(s => s.id === value);
    if (!subscription) return;

    setType(subscription.type);
    setTitle(subscription.title);
    setAffectsBalance(subscription.affectsBalance);
    if (subscription.amount != null) setAmount(String(subscription.amount));
    if (subscription.category) {
      setCategories([subscription.category]);
      setCategoryInput("");
    }
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
      // A statement's date is its due date, not when it's actually paid —
      // the backend rejects changing it, unlike a subscription's pending
      // entry, where resetting to "now" records the real payment moment.
      setDate(
        isPaying && !isStatement ? nowLocalDateTime() : transactionDateTimeLocalValue(transaction)
      );
      setAffectsBalance(transaction.affectsBalance);
      setAccountId(
        isPaying
          ? preferredAccountId ?? accounts.find(a => a.isDefault)?.id ?? NO_ACCOUNT
          : transaction.accountId ?? NO_ACCOUNT
      );
      setTargetAccountId(transaction.targetAccountId ?? NO_ACCOUNT);
      setUseInstallments(!!transaction.installments);
      setInstallments(transaction.installments ? String(transaction.installments) : "");
      setSubscriptionId(transaction.subscriptionId ?? NO_SUBSCRIPTION);
      setPending(false);
    } else {
      // A subscription payment starts from the subscription's own data; the
      // account is the user's preferred one because subscriptions have none.
      const subscription = props.subscription;
      setType(subscription?.type ?? props.initialType ?? "expense");
      setTitle(subscription?.title ?? props.initialTitle?.trim() ?? "");
      setAmount(subscription?.amount != null ? String(subscription.amount) : "");
      setCategories(subscription?.category ? [subscription.category] : []);
      setCategoryInput("");
      setDate(nowLocalDateTime());
      setAffectsBalance(subscription?.affectsBalance ?? true);
      setAccountId(preferredAccountId ?? accounts.find(a => a.isDefault)?.id ?? NO_ACCOUNT);
      setTargetAccountId(NO_ACCOUNT);
      setUseInstallments(false);
      setInstallments("");
      setSubscriptionId(subscription?.id ?? NO_SUBSCRIPTION);
      setPending(!!subscription);
    }

    // The picker needs the user's subscriptions, and not every page that
    // opens this dialog loads them (e.g. Accounts).
    if (useSubscriptionsStore.getState().subscriptions.length === 0) {
      loadSubscriptions()
        .then(() => setSubscriptionsLoaded(true))
        .catch(() => {});
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

    // A pending payment may keep no amount yet (a variable subscription's
    // amount is only known when it's paid) — it's saved as 0, shown as "Por definir".
    const amountStillOpen = pending && (!amount || parsedAmount === 0);

    if (!amountStillOpen && (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
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

    const resolvedAccountId = accountId === NO_ACCOUNT ? undefined : accountId;
    const resolvedTargetAccountId =
      isTransfer && targetAccountId !== NO_ACCOUNT ? targetAccountId : undefined;
    const resolvedInstallments =
      installmentsApply && useInstallments ? parsedInstallments : undefined;
    // undefined clears the link (the service sends null), so a transfer or a
    // "Sin suscripción" choice both unlink.
    const resolvedSubscriptionId =
      isTransfer || subscriptionId === NO_SUBSCRIPTION ? undefined : subscriptionId;
    const pendingCategory = categoryInput.trim();
    const resolvedCategories = isTransfer
      ? []
      : pendingCategory && !categories.includes(pendingCategory)
        ? [...categories, pendingCategory]
        : categories;

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
          subscriptionId: resolvedSubscriptionId,
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
          subscriptionId: resolvedSubscriptionId,
          pending,
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
              ? isStatement
                ? `Pagar ${statementAccount?.name ?? "tarjeta"}`
                : isPaying
                  ? "Pagar suscripción"
                  : isTransfer
                    ? "Editar transferencia"
                    : "Editar movimiento"
              : isTransfer
                ? "Nueva transferencia"
                : isSubscriptionPayment
                  ? "Registrar pago de suscripción"
                  : "Nuevo movimiento"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {isStatement && statement && (
            <div className="space-y-1 rounded-lg border p-3 text-sm">
              {statement.previousBalance !== 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Saldo anterior</span>
                  <span className="tabular-nums">${statement.previousBalance.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Cuotas de este mes</span>
                <span className="tabular-nums">${statement.installmentsDue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total a pagar</span>
                <span className="tabular-nums">${statement.amountDue.toLocaleString()}</span>
              </div>
              {statement.lines.length > 0 && (
                <ul className="pt-1 text-xs text-muted-foreground">
                  {statement.lines.map(line => (
                    <li key={`${line.transactionId}-${line.installment}`} className="flex justify-between">
                      <span className="truncate">
                        {line.title} ({line.installment}/{line.installments})
                      </span>
                      <span className="shrink-0 tabular-nums">${line.amount.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!isStatement && (
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
          )}

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
              disabled={isStatement}
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
              {isStatement ? "Pagar desde" : isTransfer ? "Cuenta origen" : "Cuenta (opcional)"}
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
                {(isTransfer ? transferSourceAccounts : accounts).map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* A statement's destination is always its own card — fixed server-side
              regardless of what's sent, so it's shown read-only rather than as a
              picker the user could change but that wouldn't actually take effect. */}
          {isStatement ? (
            <div className="space-y-1">
              <label className="text-sm font-medium">Tarjeta</label>
              <p className="text-sm text-muted-foreground">{statementAccount?.name ?? "—"}</p>
            </div>
          ) : (
            isTransfer && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Cuenta destino</label>
                <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {transferDestinationAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
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

          {/* A transfer or a card statement is never tied to a subscription. */}
          {!isTransfer && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Suscripción (opcional)</label>
              <Select value={subscriptionId} onValueChange={handleSubscriptionChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUBSCRIPTION}>Sin suscripción</SelectItem>
                  {linkedSubscriptionMissing && (
                    <SelectItem value={subscriptionId}>
                      {subscriptionsKnown ? "Suscripción eliminada" : "Suscripción vinculada"}
                    </SelectItem>
                  )}
                  {subscriptions.map(subscription => (
                    <SelectItem key={subscription.id} value={subscription.id}>
                      {subscription.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {props.mode === "create" && subscriptionId !== NO_SUBSCRIPTION && !linkedSubscriptionMissing && (
                <p className="text-xs text-muted-foreground">
                  Se cargaron los datos de la suscripción; puedes editarlos.
                </p>
              )}
            </div>
          )}

          {isSubscriptionPayment && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Estado</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={pending ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPending(true)}
                >
                  Por pagar
                </Button>
                <Button
                  type="button"
                  variant={!pending ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPending(false)}
                >
                  Pagado
                </Button>
              </div>
              {pending && (
                <p className="text-xs text-muted-foreground">
                  Queda como pendiente, igual que los cobros automáticos. El precio puede quedar
                  en blanco hasta que lo pagues.
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className={props.mode === "edit" ? "sm:justify-between" : undefined}>
          {props.mode === "edit" && !isStatement && (
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
