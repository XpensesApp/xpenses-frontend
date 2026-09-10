"use client";

import { useState } from "react";
import { PencilIcon, RepeatIcon, WalletIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccountsStore } from "@/store/accounts.store";
import { useSubscriptionsStore } from "@/store/subscriptions.store";
import { useExpensesStore } from "@/store/expenses.store";
import { usePaymentsStore } from "@/store/payments.store";
import { countRemainingInstallments } from "@/features/expenses/balance";
import { Expense } from "../expenses.types";
import { ExpenseDialog } from "./ExpenseDialog";

type Props = {
  expense: Expense;
};

export function ExpenseCard({ expense }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const isIncome = expense.type === "income";
  const account = useAccountsStore(state =>
    state.accounts.find(a => a.id === expense.accountId)
  );
  const subscription = useSubscriptionsStore(state =>
    state.subscriptions.find(s => s.id === expense.subscriptionId)
  );
  const allExpenses = useExpensesStore(state => state.expenses);
  const payments = usePaymentsStore(state => state.payments);

  const isCreditPurchase = expense.paymentDay != null;
  const installmentProgress =
    isCreditPurchase && expense.accountId
      ? countRemainingInstallments(expense.id, expense.accountId, allExpenses, payments)
      : null;
  const hasRemainingDebt = !!installmentProgress && installmentProgress.paid < installmentProgress.total;

  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-3 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-medium">{expense.title}</span>
            {expense.category && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {expense.category}
              </span>
            )}
            {account && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {account.name}
              </span>
            )}
            {isCreditPurchase && expense.installments && installmentProgress && (
              <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                {installmentProgress.paid}/{installmentProgress.total} cuotas pagadas
              </span>
            )}
            {isCreditPurchase && hasRemainingDebt && (
              <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none text-expense">
                Pendiente
              </span>
            )}
            {expense.subscriptionId && (
              <span
                className="flex shrink-0 items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground"
                title={subscription ? `Suscripción: ${subscription.title}` : "Suscripción eliminada"}
              >
                <RepeatIcon className="size-2.5" />
                Suscripción
              </span>
            )}
            {expense.pending && (
              <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none text-amber-600 dark:text-amber-400">
                Por pagar
              </span>
            )}
            {!expense.affectsBalance && (
              <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                Referencial
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatExpenseDate(expense.date)}
          </span>
        </div>

        {expense.pending ? (
          <span className="shrink-0 font-medium tabular-nums text-amber-600 dark:text-amber-400">
            {expense.amount === 0
              ? "Por definir"
              : `${isIncome ? "+" : "-"}$${expense.amount.toLocaleString()}`}
          </span>
        ) : (
          <span
            className={`shrink-0 font-medium tabular-nums ${
              isIncome ? "text-income" : "text-expense"
            }`}
          >
            {isIncome ? "+" : "-"}${expense.amount.toLocaleString()}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={expense.pending ? "Pagar movimiento" : "Editar movimiento"}
          onClick={() => setEditOpen(true)}
        >
          {expense.pending ? <WalletIcon /> : <PencilIcon />}
        </Button>
      </CardContent>

      <ExpenseDialog
        mode="edit"
        expense={expense}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </Card>
  );
}

function formatExpenseDate(date: string) {
  if (date.length > 10) {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleDateString();
}
