"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRightIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/Spinner";
import { useAccountsStore } from "@/store/accounts.store";
import { useTransactionsStore } from "@/store/transactions.store";
import { untrackedAccount } from "@/features/accounts/accounts.types";
import { computeAccountBalance } from "@/features/transactions/balance";
import { AccountCard } from "@/features/accounts/components/AccountCard";
import { AccountDialog } from "@/features/accounts/components/AccountDialog";
import { TransactionDialog } from "@/features/transactions/components/TransactionDialog";

export default function AccountsPage() {
    const { accounts, loadAccounts } = useAccountsStore();
    const { transactions, loadTransactions } = useTransactionsStore();
    const [createOpen, setCreateOpen] = useState(false);
    const [transferOpen, setTransferOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        Promise.all([loadAccounts(), loadTransactions()]).finally(() => setIsLoading(false));
    }, [loadAccounts, loadTransactions]);

    // Hidden when $0 so it doesn't show up as a confusing empty account by default.
    const hasUntrackedBalance = useMemo(
        () => computeAccountBalance(untrackedAccount, transactions) !== 0,
        [transactions]
    );

    const displayedAccounts = hasUntrackedBalance
        ? [...accounts, untrackedAccount]
        : accounts;

    return (
        <section className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Cuentas</h2>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
                        <ArrowLeftRightIcon />
                        Transferir
                    </Button>
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                        <PlusIcon />
                        Agregar cuenta
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <Spinner />
            ) : (
                <>
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
                </>
            )}

            <AccountDialog
                mode="create"
                open={createOpen}
                onOpenChange={setCreateOpen}
            />

            <TransactionDialog
                mode="create"
                initialType="transfer"
                open={transferOpen}
                onOpenChange={setTransferOpen}
            />
        </section>
    );
}
