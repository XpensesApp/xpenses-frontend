"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransactionsStore } from "@/store/transactions.store";
import { useAccountsStore } from "@/store/accounts.store";
import { cn } from "@/lib/utils";
import { computeBalances } from "@/features/transactions/balance";
import { ExpensesByCategoryChart } from "@/features/transactions/components/ExpensesByCategoryChart";

export default function DashboardPage() {
    const { transactions, loadTransactions } = useTransactionsStore();
    const { accounts, loadAccounts } = useAccountsStore();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        Promise.all([loadTransactions(), loadAccounts()]).finally(() => setIsLoading(false));
    }, [loadTransactions, loadAccounts]);

    const { actualBalance, savings, debt, generalBalance } = useMemo(() => {
        return computeBalances(transactions, accounts);
    }, [transactions, accounts]);

    // Everything you own, savings included, before the card debt is subtracted.
    const total = actualBalance + savings;
    // What's left to spend without dipping into savings or money that's
    // really already owed to a card — the liquid balance minus the debt,
    // unfloored on purpose: negative means you're spending ahead of paying it off.
    const freeToSpend = actualBalance - debt;

    return (
        <section className="p-6 space-y-6">
            <h2 className="text-lg font-semibold">Dashboard</h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <BalanceTile
                    label="Total"
                    description="Todo lo que tienes, ahorros incluidos, sin restar la deuda"
                    value={total}
                    isLoading={isLoading}
                    isNegative={total < 0}
                />
                <BalanceTile
                    label="Deuda"
                    description="Lo que debes en tus tarjetas de crédito"
                    value={debt}
                    isLoading={isLoading}
                    isNegative={debt > 0}
                />
                <BalanceTile
                    label="Balance real"
                    description="Lo que realmente tienes, considerando la deuda pendiente"
                    value={generalBalance}
                    isLoading={isLoading}
                    isNegative={generalBalance < 0}
                />
                <BalanceTile
                    label="Ahorros"
                    description="Dinero guardado, no disponible para gastar"
                    value={savings}
                    isLoading={isLoading}
                    isNegative={savings < 0}
                />
                <BalanceTile
                    label="Disponible para gastar"
                    description="Tu balance líquido menos la deuda pendiente, sin contar ahorros"
                    value={freeToSpend}
                    isLoading={isLoading}
                    isNegative={freeToSpend < 0}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Gastos por categoría</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Spinner /> : <ExpensesByCategoryChart transactions={transactions} />}
                </CardContent>
            </Card>
        </section>
    );
}

function BalanceTile({
    label,
    description,
    value,
    isLoading,
    isNegative,
}: {
    label: string;
    description: string;
    value: number;
    isLoading: boolean;
    isNegative: boolean;
}) {
    return (
        <div className="space-y-1 rounded-lg border p-4">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            {isLoading ? (
                <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
            ) : (
                <p
                    className={cn(
                        "text-2xl font-semibold tabular-nums",
                        isNegative ? "text-expense" : "text-income"
                    )}
                >
                    ${value.toLocaleString()}
                </p>
            )}
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
    );
}
