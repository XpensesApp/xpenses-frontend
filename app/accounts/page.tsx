"use client";

import { useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccountsStore } from "@/store/accounts.store";
import { useExpensesStore } from "@/store/expenses.store";
import { AccountCard } from "@/features/accounts/components/AccountCard";
import { AccountDialog } from "@/features/accounts/components/AccountDialog";

export default function AccountsPage() {
    const { accounts, loadAccounts } = useAccountsStore();
    const loadExpenses = useExpensesStore(state => state.loadExpenses);
    const [createOpen, setCreateOpen] = useState(false);

    useEffect(() => {
        loadAccounts();
        loadExpenses();
    }, [loadAccounts, loadExpenses]);

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
                {accounts.map(account => (
                    <AccountCard key={account.id} account={account} />
                ))}
            </ul>

            {accounts.length === 0 && (
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
