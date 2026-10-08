"use client";

import { useState } from "react";
import { CreditCardIcon, PencilIcon, PinIcon, StarIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, errorMessage } from "@/lib/utils";
import { useTransactionsStore } from "@/store/transactions.store";
import { useAccountsStore } from "@/store/accounts.store";
import { computeAccountBalance } from "@/features/transactions/balance";
import { formatDateTime } from "@/lib/dates";
import { Account } from "../accounts.types";
import { AccountDialog, accountTypeLabels } from "./AccountDialog";
import { TransactionDialog } from "@/features/transactions/components/TransactionDialog";

type Props = {
  account: Account;
};

export function AccountCard({ account }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [settingPreferred, setSettingPreferred] = useState(false);
  const [preferredError, setPreferredError] = useState<string | null>(null);
  const transactions = useTransactionsStore(state => state.transactions);
  const setPreferredAccount = useAccountsStore(state => state.setPreferredAccount);

  async function handleSetPreferred() {
    setSettingPreferred(true);
    setPreferredError(null);
    try {
      await setPreferredAccount(account.id);
    } catch (error) {
      setPreferredError(errorMessage(error, "No se pudo actualizar. Intenta de nuevo."));
    } finally {
      setSettingPreferred(false);
    }
  }

  const balance = computeAccountBalance(account, transactions);
  const isDebt = account.type === "credit";
  const isNegative = isDebt ? balance > 0 : balance < 0;

  // The card's own monthly bill — a regular transaction the statements job
  // generates, so there's nothing to compute here, just find it. A card
  // only ever has one pending statement at a time.
  const pendingStatement = isDebt
    ? transactions.find(t => t.pending && t.statement?.accountId === account.id)
    : undefined;

  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-3 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-medium">{account.name}</span>
            {account.isDefault && (
              <StarIcon
                aria-label="Cuenta por defecto"
                className="size-3.5 shrink-0 fill-current text-amber-500"
              />
            )}
            {account.isPreferred && (
              <PinIcon
                aria-label="Cuenta predeterminada para nuevos movimientos"
                className="size-3.5 shrink-0 fill-current text-primary"
              />
            )}
            {!account.isUntracked && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {accountTypeLabels[account.type]}
              </span>
            )}
            {account.isSavings && (
              <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                Ahorro
              </span>
            )}
          </div>
          {account.paymentDay && (
            <span className="text-xs text-muted-foreground">
              Día de pago: {account.paymentDay}
            </span>
          )}
          {pendingStatement && (
            <div className="text-xs text-amber-600 dark:text-amber-400">
              Vence {formatDateTime(pendingStatement.date)}: $
              {pendingStatement.amount.toLocaleString()}
            </div>
          )}
          {preferredError && <p className="text-xs text-destructive">{preferredError}</p>}
        </div>

        <div className="shrink-0 text-right">
          {isDebt && (
            <div className="text-[10px] text-muted-foreground">
              {balance > 0 ? "Deuda" : "Sin deuda"}
            </div>
          )}
          <span
            className={cn(
              "font-medium tabular-nums",
              isNegative ? "text-expense" : "text-income"
            )}
          >
            ${Math.abs(balance).toLocaleString()}
          </span>
        </div>

        {pendingStatement && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Pagar cuenta"
            onClick={() => setPayOpen(true)}
          >
            <CreditCardIcon />
          </Button>
        )}

        {!account.isUntracked && !account.isPreferred && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Usar como cuenta predeterminada"
            disabled={settingPreferred}
            onClick={handleSetPreferred}
          >
            <PinIcon />
          </Button>
        )}

        {!account.isUntracked && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Editar cuenta"
            onClick={() => setEditOpen(true)}
          >
            <PencilIcon />
          </Button>
        )}
      </CardContent>

      {!account.isUntracked && (
        <AccountDialog
          mode="edit"
          account={account}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      {pendingStatement && (
        <TransactionDialog
          mode="edit"
          transaction={pendingStatement}
          open={payOpen}
          onOpenChange={setPayOpen}
        />
      )}
    </Card>
  );
}
