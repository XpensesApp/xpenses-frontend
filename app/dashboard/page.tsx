"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
                    {isLoading ? <ChartSkeleton /> : <ExpensesByCategoryChart transactions={transactions} />}
                </CardContent>
            </Card>
        </section>
    );
}

// Horizontal bars of decreasing length, like ExpensesByCategoryChart's
// (category label on the left, bar to the right), at about its minimum height.
function ChartSkeleton() {
    const barWidths = ["w-4/5", "w-3/5", "w-2/5", "w-1/4"];

    return (
        <div role="status" aria-busy="true" className="space-y-4 py-2">
            <span className="sr-only">Cargando...</span>
            {barWidths.map(width => (
                <div key={width} aria-hidden className="flex items-center gap-3">
                    <Skeleton className="h-4 w-24 shrink-0" />
                    <Skeleton className={`h-6 ${width}`} />
                </div>
            ))}
        </div>
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
                // text-2xl's line box is 32px: 6 (h-6) + 2 × my-1.
                <Skeleton className="my-1 h-6 w-28" />
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
