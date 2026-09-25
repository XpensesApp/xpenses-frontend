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
import { useAccountsStore } from "@/store/accounts.store";
import { Account, AccountType } from "@/features/accounts/accounts.types";

export const accountTypeLabels: Record<AccountType, string> = {
  debit: "Débito",
  credit: "Crédito",
  cash: "Efectivo",
  other: "Otro",
};

const accountTypes: AccountType[] = ["debit", "credit", "cash", "other"];

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

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("debit");
  const [paymentDay, setPaymentDay] = useState("");
  const [isSavings, setIsSavings] = useState(false);

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
    } else {
      setName("");
      setType("debit");
      setPaymentDay("");
      setIsSavings(false);
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

    setSaving(true);
    setError(null);

    try {
      if (props.mode === "edit") {
        await updateAccount({
          ...props.account,
          name: trimmedName,
          type,
          paymentDay: parsedPaymentDay,
          isSavings: type === "credit" ? undefined : isSavings,
        });
      } else {
        await addAccount({
          id: crypto.randomUUID(),
          name: trimmedName,
          type,
          paymentDay: parsedPaymentDay,
          isSavings: type === "credit" ? undefined : isSavings,
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
      await deleteAccount(props.account.id);
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
                  }}
                >
                  {accountTypeLabels[option]}
                </Button>
              ))}
            </div>
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

        <DialogFooter className={props.mode === "edit" ? "sm:justify-between" : undefined}>
          {props.mode === "edit" && (
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
