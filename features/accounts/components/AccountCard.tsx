"use client";

import { useState } from "react";
import { CreditCardIcon, PencilIcon, StarIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAccountsStore } from "@/store/accounts.store";
import { useExpensesStore } from "@/store/expenses.store";
import { computeAccountBalance } from "@/features/expenses/balance";
import { Account } from "../accounts.types";
import { AccountDialog, accountTypeLabels } from "./AccountDialog";
import { AccountPaymentDialog } from "./AccountPaymentDialog";

type Props = {
  account: Account;
};

export function AccountCard({ account }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const expenses = useExpensesStore(state => state.expenses);
  const setDefaultAccount = useAccountsStore(state => state.setDefaultAccount);
  const payFullDebt = useExpensesStore(state => state.payFullDebt);

  const balance = computeAccountBalance(account, expenses);
  const isDebt = account.type === "credit";
  const isNegative = isDebt ? balance > 0 : balance < 0;
  const canPay = isDebt && balance > 0;

  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-3 px-3 py-2">
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

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-medium">{account.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {accountTypeLabels[account.type]}
            </span>
          </div>
          {account.paymentDay && (
            <span className="text-xs text-muted-foreground">
              Día de pago: {account.paymentDay}
            </span>
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

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Editar cuenta"
          onClick={() => setEditOpen(true)}
        >
          <PencilIcon />
        </Button>
      </CardContent>

      <AccountDialog
        mode="edit"
        account={account}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {canPay && (
        <AccountPaymentDialog
          variant="manual"
          account={account}
          amountDue={balance}
          open={payOpen}
          onOpenChange={setPayOpen}
          onConfirmPayment={amount => payFullDebt(account.id, amount)}
        />
      )}
    </Card>
  );
}
