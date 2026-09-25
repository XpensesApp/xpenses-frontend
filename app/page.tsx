"use client";

import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/Spinner";
import { useTransactionsStore } from "@/store/transactions.store";
import { useAccountsStore } from "@/store/accounts.store";
import { useSubscriptionsStore } from "@/store/subscriptions.store";
import { usePaymentsStore } from "@/store/payments.store";
import { normalizeForSearch, cn } from "@/lib/utils";
import { computeBalances } from "@/features/transactions/balance";
import { TransactionCard } from "@/features/transactions/components/TransactionCard";
import { CreateTransactionDialog } from "@/features/transactions/components/CreateTransactionDialog";
import { PaymentCard } from "@/features/payments/components/PaymentCard";
import { UpcomingCardPayments } from "@/features/accounts/components/UpcomingCardPayments";
import {
    TransactionFilters,
    TransactionFiltersState,
    emptyTransactionFilters,
} from "@/features/transactions/components/TransactionFilters";

export default function MovementsPage() {
    const { transactions, loadTransactions } = useTransactionsStore();
    const { accounts, loadAccounts } = useAccountsStore();
    const { loadSubscriptions } = useSubscriptionsStore();
    const { payments, loadPayments } = usePaymentsStore();
    const [filters, setFilters] = useState<TransactionFiltersState>(emptyTransactionFilters);
    const [showFilters, setShowFilters] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const hasActiveFilters =
        filters.search !== "" || filters.category !== "" || filters.account !== "";

    useEffect(() => {
        Promise.all([loadTransactions(), loadAccounts(), loadPayments(), loadSubscriptions()]).finally(
            () => setIsLoading(false)
        );
    }, [loadTransactions, loadAccounts, loadPayments, loadSubscriptions]);

    const { actualBalance, savings, debt, generalBalance } = useMemo(() => {
        return computeBalances(transactions, payments, accounts);
    }, [transactions, payments, accounts]);

    const categories = useMemo(() => {
        return Array.from(new Set(transactions.flatMap(t => t.categories)));
    }, [transactions]);

    // Credit-card payments are movements too (a real cash outflow), shown
    // alongside transactions in the same list — but they have no title/category
    // of their own, so search matches a synthetic "pago <card>" label and a
    // category filter always excludes them, same as an uncategorized transaction.
    const movements = useMemo(() => {
        const search = normalizeForSearch(filters.search.trim());

        const filteredTransactions = transactions.filter(transaction => {
            if (search && !normalizeForSearch(transaction.title).includes(search)) {
                return false;
            }
            if (filters.category && !transaction.categories.includes(filters.category)) {
                return false;
            }
            if (filters.account && transaction.accountId !== filters.account) {
                return false;
            }
            return true;
        });

        const filteredPayments = payments.filter(payment => {
            if (filters.category) return false;
            if (
                filters.account &&
                payment.cardAccountId !== filters.account &&
                payment.sourceAccountId !== filters.account
            ) {
                return false;
            }
            if (search) {
                const cardName = accounts.find(a => a.id === payment.cardAccountId)?.name ?? "";
                if (!normalizeForSearch(`pago ${cardName}`).includes(search)) return false;
            }
            return true;
        });

        return [
            ...filteredTransactions.map(transaction => ({
                kind: "transaction" as const,
                id: transaction.id,
                date: transaction.date,
                amount: transaction.amount,
                transaction,
            })),
            ...filteredPayments.map(payment => ({
                kind: "payment" as const,
                id: payment.id,
                date: payment.date,
                amount: payment.amount,
                payment,
            })),
        ];
    }, [transactions, payments, accounts, filters]);

    const sortedMovements = useMemo(() => {
        const list = [...movements];

        switch (filters.sort) {
            case "date-asc":
                return list.sort((a, b) => a.date.localeCompare(b.date));
            case "date-desc":
                return list.sort((a, b) => b.date.localeCompare(a.date));
            case "price-asc":
                return list.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
            case "price-desc":
                return list.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
            default:
                return list;
        }
    }, [movements, filters.sort]);

    return (
        <section className="p-6 space-y-8">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1 rounded-lg border p-4">
                    <span className="text-sm font-medium text-muted-foreground">
                        Balance general (considera deuda)
                    </span>
                    <p
                        className={cn(
                            "text-2xl font-semibold tabular-nums",
                            generalBalance < 0 ? "text-expense" : "text-income"
                        )}
                    >
                        ${generalBalance.toLocaleString()}
                    </p>
                </div>

                <div className="space-y-1 rounded-lg border p-4">
                    <span className="text-sm font-medium text-muted-foreground">
                        Balance actual (sin deuda)
                    </span>
                    <p
                        className={cn(
                            "text-2xl font-semibold tabular-nums",
                            actualBalance < 0 ? "text-expense" : "text-income"
                        )}
                    >
                        ${actualBalance.toLocaleString()}
                    </p>
                </div>

                <div className="space-y-1 rounded-lg border p-4">
                    <span className="text-sm font-medium text-muted-foreground">
                        Ahorros
                    </span>
                    <p
                        className={cn(
                            "text-2xl font-semibold tabular-nums",
                            savings < 0 ? "text-expense" : "text-income"
                        )}
                    >
                        ${savings.toLocaleString()}
                    </p>
                </div>

                <div className="space-y-1 rounded-lg border p-4">
                    <span className="text-sm font-medium text-muted-foreground">
                        Deuda pendiente
                    </span>
                    <p
                        className={cn(
                            "text-2xl font-semibold tabular-nums",
                            debt > 0 ? "text-expense" : "text-income"
                        )}
                    >
                        ${debt.toLocaleString()}
                    </p>
                </div>
            </div>

            <UpcomingCardPayments />

            <div className="space-y-3">
                <h2 className="text-lg font-semibold">
                    Registrar movimiento
                </h2>

                <CreateTransactionDialog />
            </div>

            <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                        Tus movimientos
                    </h2>

                    <Button
                        variant={hasActiveFilters ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowFilters(show => !show)}
                    >
                        <SlidersHorizontalIcon />
                        Filtros
                    </Button>
                </div>

                {showFilters && (
                    <TransactionFilters
                        filters={filters}
                        onFiltersChange={setFilters}
                        categories={categories}
                        accounts={accounts}
                    />
                )}

                {isLoading ? (
                    <Spinner />
                ) : (
                    <>
                        <ul className="space-y-2">
                            {sortedMovements.map(movement =>
                                movement.kind === "transaction" ? (
                                    <TransactionCard key={`transaction-${movement.id}`} transaction={movement.transaction} />
                                ) : (
                                    <PaymentCard key={`payment-${movement.id}`} payment={movement.payment} />
                                )
                            )}
                        </ul>

                        {sortedMovements.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No se encontraron movimientos con estos filtros.
                            </p>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
