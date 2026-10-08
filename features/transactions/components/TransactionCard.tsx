"use client";

import { useState } from "react";
import { PencilIcon, RepeatIcon, WalletIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccountsStore } from "@/store/accounts.store";
import { useSubscriptionsStore } from "@/store/subscriptions.store";
import { useTransactionsStore } from "@/store/transactions.store";
import { countPaidInstallments } from "@/features/transactions/balance";
import { formatDateTime } from "@/lib/dates";
import { Transaction } from "../transactions.types";
import { TransactionDialog } from "./TransactionDialog";

type Props = {
  transaction: Transaction;
};

const MAX_VISIBLE_CATEGORIES = 3;

export function TransactionCard({ transaction }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const isIncome = transaction.type === "income";
  const isTransfer = transaction.type === "transfer";
  const account = useAccountsStore(state =>
    state.accounts.find(a => a.id === transaction.accountId)
  );
  const targetAccount = useAccountsStore(state =>
    state.accounts.find(a => a.id === transaction.targetAccountId)
  );
  const subscription = useSubscriptionsStore(state =>
    state.subscriptions.find(s => s.id === transaction.subscriptionId)
  );
  const allTransactions = useTransactionsStore(state => state.transactions);

  const isCreditPurchase = transaction.type === "expense" && account?.type === "credit";
  const installmentProgress = isCreditPurchase
    ? countPaidInstallments(transaction.id, allTransactions)
    : null;
  const hasRemainingDebt = !!installmentProgress && installmentProgress.paid < installmentProgress.total;

  const visibleCategories = transaction.categories.slice(0, MAX_VISIBLE_CATEGORIES);
  const hiddenCategories = transaction.categories.slice(MAX_VISIBLE_CATEGORIES);

  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-3 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="min-w-0 truncate font-medium">{transaction.title}</span>
            {visibleCategories.map(category => (
              <span key={category} className="shrink-0 text-xs text-muted-foreground">
                {category}
              </span>
            ))}
            {hiddenCategories.length > 0 && (
              <span
                className="shrink-0 text-xs text-muted-foreground"
                title={hiddenCategories.join(", ")}
              >
                +{hiddenCategories.length}
              </span>
            )}
            {isTransfer ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {account?.name ?? "?"} → {targetAccount?.name ?? "?"}
              </span>
            ) : (
              account && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {account.name}
                </span>
              )
            )}
            {isCreditPurchase && transaction.installments && installmentProgress && (
              <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                {installmentProgress.paid}/{installmentProgress.total} cuotas pagadas
              </span>
            )}
            {isCreditPurchase && hasRemainingDebt && (
              <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none text-expense">
                Pendiente
              </span>
            )}
            {transaction.subscriptionId && (
              <span
                className="flex shrink-0 items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground"
                title={subscription ? `Suscripción: ${subscription.title}` : "Suscripción eliminada"}
              >
                <RepeatIcon className="size-2.5" />
                Suscripción
              </span>
            )}
            {transaction.pending && (
              <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none text-amber-600 dark:text-amber-400">
                Por pagar
              </span>
            )}
            {!transaction.affectsBalance && (
              <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                Referencial
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(transaction.date)}
          </span>
        </div>

        {transaction.pending ? (
          <span className="shrink-0 font-medium tabular-nums text-amber-600 dark:text-amber-400">
            {transaction.amount === 0
              ? "Por definir"
              : `${isIncome ? "+" : "-"}$${transaction.amount.toLocaleString()}`}
          </span>
        ) : isTransfer ? (
          // Neither a gain nor a loss overall — no sign, no income/expense color.
          <span className="shrink-0 font-medium tabular-nums">
            ${transaction.amount.toLocaleString()}
          </span>
        ) : (
          <span
            className={`shrink-0 font-medium tabular-nums ${
              isIncome ? "text-income" : "text-expense"
            }`}
          >
            {isIncome ? "+" : "-"}${transaction.amount.toLocaleString()}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={transaction.pending ? "Pagar movimiento" : "Editar movimiento"}
          onClick={() => setEditOpen(true)}
        >
          {transaction.pending ? <WalletIcon /> : <PencilIcon />}
        </Button>
      </CardContent>

      <TransactionDialog
        mode="edit"
        transaction={transaction}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </Card>
  );
}
