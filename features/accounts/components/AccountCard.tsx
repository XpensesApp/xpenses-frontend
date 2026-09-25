"use client";

import { useState } from "react";
import { CreditCardIcon, PencilIcon, StarIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAccountsStore } from "@/store/accounts.store";
import { useTransactionsStore } from "@/store/transactions.store";
import { usePaymentsStore } from "@/store/payments.store";
import {
  computeAccountBalance,
  computeNextCardObligation,
  computeUpcomingObligations,
} from "@/features/transactions/balance";
import { periodKey } from "@/lib/dates";
import { Account } from "../accounts.types";
import { AccountDialog, accountTypeLabels } from "./AccountDialog";
import { AccountPaymentDialog } from "./AccountPaymentDialog";

const periodFormatter = new Intl.DateTimeFormat(undefined, { month: "short" });

function formatPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  return periodFormatter.format(new Date(year, month - 1, 1));
}

function formatDueDate(date: Date) {
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

type Props = {
  account: Account;
};

export function AccountCard({ account }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const transactions = useTransactionsStore(state => state.transactions);
  const payments = usePaymentsStore(state => state.payments);
  const setDefaultAccount = useAccountsStore(state => state.setDefaultAccount);
  const addPayment = usePaymentsStore(state => state.addPayment);

  const balance = computeAccountBalance(account, transactions, payments);
  const isDebt = account.type === "credit";
  const isNegative = isDebt ? balance > 0 : balance < 0;

  const nextObligation = isDebt
    ? computeNextCardObligation(account.id, transactions, payments)
    : null;
  const canPay = !!nextObligation?.isDue;

  const upcoming = isDebt && nextObligation
    ? computeUpcomingObligations(account.id, transactions, payments)
        .filter(o => o.period > periodKey(nextObligation.dueDate))
        .slice(0, 3)
    : [];

  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-3 px-3 py-2">
        {!account.isUntracked && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              account.isDefault ? "Quitar cuenta por defecto" : "Marcar como cuenta por defecto"
            }
            onClick={() => setDefaultAccount(account.id)}
          >
            <StarIcon
              className={cn(account.isDefault && "fill-current text-amber-500")}
            />
          </Button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-medium">{account.name}</span>
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
          {nextObligation && (
            <div
              className={cn(
                "text-xs",
                nextObligation.isDue
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
              )}
            >
              Vence {formatDueDate(nextObligation.dueDate)}: $
              {nextObligation.amount.toLocaleString()}
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Después:{" "}
              {upcoming
                .map(o => `${formatPeriod(o.period)} $${o.amount.toLocaleString()}`)
                .join(" · ")}
            </div>
          )}
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

        {canPay && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Pagar cuenta"
            onClick={() => setPayOpen(true)}
          >
            <CreditCardIcon />
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

      {canPay && nextObligation && (
        <AccountPaymentDialog
          key={payOpen ? "open" : "closed"}
          account={account}
          amountDue={nextObligation.amount}
          open={payOpen}
          onOpenChange={setPayOpen}
          onConfirmPayment={(amount, sourceAccountId, date) =>
            addPayment({
              id: crypto.randomUUID(),
              cardAccountId: account.id,
              amount,
              date,
              sourceAccountId,
            })
          }
        />
      )}
    </Card>
  );
}
