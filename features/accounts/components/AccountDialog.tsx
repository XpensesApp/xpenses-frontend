"use client";

import { useRef, useState } from "react";
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
import { useAccountsStore } from "@/store/accounts.store";
import { Account, AccountType } from "@/features/accounts/accounts.types";
import { errorMessage, errorStatus } from "@/lib/utils";

export const accountTypeLabels: Record<AccountType, string> = {
  debit: "Débito",
  credit: "Crédito",
  cash: "Efectivo",
  // Only the synthetic untracked account uses "other" — never user-selectable
  // (the backend only accepts debit/credit/cash), but still required here
  // since accountTypeLabels is a Record over the whole AccountType union.
  other: "Otro",
};

const accountTypes: AccountType[] = ["debit", "credit", "cash"];

type CreateProps = {
  mode: "create";
};

type EditProps = {
  mode: "edit";
  account: Account;
};

type Props = (CreateProps | EditProps) & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function AccountDialog(props: Props) {
  const { open, onOpenChange, onSaved } = props;

  const addAccount = useAccountsStore(state => state.addAccount);
  const updateAccount = useAccountsStore(state => state.updateAccount);
  const deleteAccount = useAccountsStore(state => state.deleteAccount);
  const loadAccounts = useAccountsStore(state => state.loadAccounts);

  // The backend rejects all three unconditionally: the default account can
  // never be deleted, any other one is refused (409) while it still has
  // transactions, and the preferred account is refused (409) until another
  // one is made preferred first — hiding the option here avoids a doomed
  // round trip.
  const canDelete =
    props.mode === "edit" &&
    !props.account.isDefault &&
    !props.account.transactionCount &&
    !props.account.isPreferred;

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("debit");
  const [paymentDay, setPaymentDay] = useState("");
  const [isSavings, setIsSavings] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("0");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  function handleOpenAutoFocus(e: Event) {
    e.preventDefault();

    if (props.mode === "edit") {
      setName(props.account.name);
      setType(props.account.type);
      setPaymentDay(
        props.account.paymentDay ? String(props.account.paymentDay) : ""
      );
      setIsSavings(!!props.account.isSavings);
      setOpeningBalance(String(props.account.openingBalance ?? 0));
    } else {
      setName("");
      setType("debit");
      setPaymentDay("");
      setIsSavings(false);
      setOpeningBalance("0");
    }

    setError(null);
    setConfirmingDelete(false);
    nameRef.current?.focus();
  }

  async function handleSave() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("El nombre es obligatorio.");
      return;
    }

    const parsedPaymentDay = paymentDay ? Number(paymentDay) : undefined;

    if (
      paymentDay &&
      (!Number.isInteger(parsedPaymentDay) ||
        parsedPaymentDay! < 1 ||
        parsedPaymentDay! > 31)
    ) {
      setError("El día de pago debe ser un número entre 1 y 31.");
      return;
    }

    const parsedOpeningBalance = Number(openingBalance || "0");

    setSaving(true);
    setError(null);

    try {
      if (props.mode === "edit") {
        await updateAccount({
          ...props.account,
          name: trimmedName,
          type,
          paymentDay: parsedPaymentDay,
          isSavings: type === "credit" ? false : isSavings,
          openingBalance: parsedOpeningBalance,
        });
      } else {
        await addAccount({
          name: trimmedName,
          type,
          paymentDay: parsedPaymentDay,
          isSavings: type === "credit" ? false : isSavings,
          openingBalance: parsedOpeningBalance,
        });
      }

      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      setError(errorMessage(error, "No se pudo guardar. Intenta de nuevo."));
      // A 409 means the account changed concurrently — refresh so the next
      // save attempt (the user clicking "Guardar" again) starts from current data.
      if (errorStatus(error) === 409) loadAccounts();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (props.mode !== "edit") return;

    setDeleting(true);
    setError(null);

    try {
      await deleteAccount(props.account.id);
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      setError(errorMessage(error, "No se pudo eliminar. Intenta de nuevo."));
      if (errorStatus(error) === 409) loadAccounts();
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={handleOpenAutoFocus}>
        <DialogHeader>
          <DialogTitle>
            {props.mode === "edit" ? "Editar cuenta" : "Nueva cuenta"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre</label>
            <Input
              ref={nameRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ej. CMR"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {accountTypes.map(option => (
                <Button
                  key={option}
                  type="button"
                  variant={type === option ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setType(option);
                    if (option === "credit") setIsSavings(false);
                    // paymentDay is only valid for a credit account — the
                    // backend 400s otherwise, so clear it rather than leave a
                    // stale value from before the switch sitting in state
                    // behind the now-hidden field.
                    else setPaymentDay("");
                  }}
                >
                  {accountTypeLabels[option]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Saldo inicial</label>
            <MoneyInput value={openingBalance} onChange={setOpeningBalance} />
            {props.mode === "edit" && (
              <p className="text-xs text-muted-foreground">
                Cambiarlo ajusta el saldo actual por la misma diferencia — útil para
                hacerlo calzar con el saldo real del banco.
              </p>
            )}
          </div>

          {type !== "credit" && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Cuenta de ahorro</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={!isSavings ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsSavings(false)}
                >
                  No
                </Button>
                <Button
                  type="button"
                  variant={isSavings ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsSavings(true)}
                >
                  Sí
                </Button>
              </div>
              {isSavings && (
                <p className="text-xs text-muted-foreground">
                  Su dinero no se contará en tu balance actual, solo en el balance general.
                </p>
              )}
            </div>
          )}

          {type === "credit" && (
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Día de pago (opcional)
              </label>
              <Input
                type="number"
                min="1"
                max="31"
                step="1"
                inputMode="numeric"
                value={paymentDay}
                onChange={e => setPaymentDay(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleSave();
                }}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className={canDelete ? "sm:justify-between" : undefined}>
          {canDelete && (
            confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  ¿Eliminar esta cuenta?
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
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
