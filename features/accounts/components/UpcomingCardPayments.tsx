"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAccountsStore } from "@/store/accounts.store";
import { useExpensesStore } from "@/store/expenses.store";
import { usePaymentsStore } from "@/store/payments.store";
import {
  computeNextCardObligation,
  computeUpcomingObligations,
} from "@/features/expenses/balance";
import { periodKey } from "@/lib/dates";
import { Account } from "../accounts.types";
import { AccountPaymentDialog } from "./AccountPaymentDialog";

type Obligation = { amount: number; dueDate: Date; isDue: boolean };

const periodFormatter = new Intl.DateTimeFormat(undefined, { month: "short" });

function formatPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  return periodFormatter.format(new Date(year, month - 1, 1));
}

function formatDueDate(date: Date) {
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "long" });
}

/**
 * Actionable pending card payments, surfaced directly on the dashboard
 * instead of only inside a dialog. Every value here — the amount, the due
 * date, which purchases it covers — is derived on render from the
 * `expenses` (purchases) and `payments` stores via `computeNextCardObligation`.
 * Paying doesn't update or remove anything here: it records a Payment, and
 * on the next render this list simply reflects the smaller remaining debt —
 * or the next card in line, once one is fully settled.
 */
export function UpcomingCardPayments() {
  const accounts = useAccountsStore(state => state.accounts);
  const expenses = useExpensesStore(state => state.expenses);
  const payments = usePaymentsStore(state => state.payments);

  const pending = accounts
    .filter(a => a.type === "credit")
    .map(account => ({
      account,
      obligation: computeNextCardObligation(account.id, expenses, payments),
    }))
    .filter(
      (entry): entry is { account: Account; obligation: Obligation } =>
        entry.obligation !== null
    )
    .sort((a, b) => a.obligation.dueDate.getTime() - b.obligation.dueDate.getTime());

  if (pending.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Pagos de tarjeta pendientes</h2>

      <ul className="space-y-2">
        {pending.map(({ account, obligation }) => (
          <CardPaymentRow key={account.id} account={account} obligation={obligation} />
        ))}
      </ul>
    </div>
  );
}

function CardPaymentRow({
  account,
  obligation,
}: {
  account: Account;
  obligation: Obligation;
}) {
  const [payOpen, setPayOpen] = useState(false);
  const expenses = useExpensesStore(state => state.expenses);
  const payments = usePaymentsStore(state => state.payments);
  const addPayment = usePaymentsStore(state => state.addPayment);

  const upcoming = computeUpcomingObligations(account.id, expenses, payments)
    .filter(o => o.period > periodKey(obligation.dueDate))
    .slice(0, 3);

  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-3 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-medium">{account.name}</span>
            <span
              className={cn(
                "shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none",
                obligation.isDue
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
              )}
            >
              {obligation.isDue ? "Pendiente" : "Aún no vence"}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Vence {formatDueDate(obligation.dueDate)}
            {upcoming.length > 0 && (
              <>
                {" "}
                · Después:{" "}
                {upcoming
                  .map(o => `${formatPeriod(o.period)} $${o.amount.toLocaleString()}`)
                  .join(" · ")}
              </>
            )}
          </span>
        </div>

        <span
          className={cn(
            "shrink-0 font-medium tabular-nums",
            obligation.isDue ? "text-expense" : "text-muted-foreground"
          )}
        >
          ${obligation.amount.toLocaleString()}
        </span>

        {obligation.isDue && (
          <Button size="sm" onClick={() => setPayOpen(true)}>
            Pagar
          </Button>
        )}
      </CardContent>

      {obligation.isDue && (
        <AccountPaymentDialog
          key={payOpen ? "open" : "closed"}
          account={account}
          amountDue={obligation.amount}
          open={payOpen}
          onOpenChange={setPayOpen}
          onConfirmPayment={(amount, sourceAccountId) =>
            addPayment({
              id: crypto.randomUUID(),
              cardAccountId: account.id,
              amount,
              date: new Date().toISOString(),
              sourceAccountId,
            })
          }
        />
      )}
    </Card>
  );
}
