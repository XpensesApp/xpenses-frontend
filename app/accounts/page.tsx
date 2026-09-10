"use client";

import { useEffect, useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccountsStore } from "@/store/accounts.store";
import { useExpensesStore } from "@/store/expenses.store";
import { usePaymentsStore } from "@/store/payments.store";
import { untrackedAccount } from "@/features/accounts/accounts.types";
import { computeAccountBalance } from "@/features/expenses/balance";
import { AccountCard } from "@/features/accounts/components/AccountCard";
import { AccountDialog } from "@/features/accounts/components/AccountDialog";

export default function AccountsPage() {
    const { accounts, loadAccounts } = useAccountsStore();
    const { expenses, loadExpenses } = useExpensesStore();
    const { payments, loadPayments } = usePaymentsStore();
    const [createOpen, setCreateOpen] = useState(false);

    useEffect(() => {
        loadAccounts();
        loadExpenses();
        loadPayments();
    }, [loadAccounts, loadExpenses, loadPayments]);

    // Hidden when $0 so it doesn't show up as a confusing empty account by default.
    const hasUntrackedBalance = useMemo(
        () => computeAccountBalance(untrackedAccount, expenses, payments) !== 0,
        [expenses, payments]
    );

    const displayedAccounts = hasUntrackedBalance
        ? [...accounts, untrackedAccount]
        : accounts;

    return (
        <section className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Cuentas</h2>

                <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <PlusIcon />
                    Agregar cuenta
                </Button>
            </div>

            <ul className="space-y-2">
                {displayedAccounts.map(account => (
                    <AccountCard key={account.id} account={account} />
                ))}
            </ul>

            {displayedAccounts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Aún no has agregado cuentas.
                </p>
            )}

            <AccountDialog
                mode="create"
                open={createOpen}
                onOpenChange={setCreateOpen}
            />
        </section>
    );
}
