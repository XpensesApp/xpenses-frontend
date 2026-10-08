"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2Icon, SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/Spinner";
import { useTransactionsStore } from "@/store/transactions.store";
import { useAccountsStore } from "@/store/accounts.store";
import { useSubscriptionsStore } from "@/store/subscriptions.store";
import { normalizeForSearch } from "@/lib/utils";
import { compareTransactionsByMoment } from "@/lib/dates";
import { TransactionCard } from "@/features/transactions/components/TransactionCard";
import { CreateTransactionDialog } from "@/features/transactions/components/CreateTransactionDialog";
import { UpcomingCardPayments } from "@/features/accounts/components/UpcomingCardPayments";
import {
    TransactionFilters,
    TransactionFiltersState,
    emptyTransactionFilters,
} from "@/features/transactions/components/TransactionFilters";

export default function MovementsPage() {
    const { transactions, loadTransactions, loadMoreTransactions, hasMore, isLoadingMore } =
        useTransactionsStore();
    const { accounts, loadAccounts } = useAccountsStore();
    const { loadSubscriptions } = useSubscriptionsStore();
    const [filters, setFilters] = useState<TransactionFiltersState>(emptyTransactionFilters);
    const [showFilters, setShowFilters] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const hasActiveFilters =
        filters.search !== "" || filters.category !== "" || filters.account !== "";

    useEffect(() => {
        Promise.all([
            loadTransactions(),
            loadAccounts(),
            loadSubscriptions(),
        ]).finally(() => setIsLoading(false));
    }, [loadTransactions, loadAccounts, loadSubscriptions]);

    const categories = useMemo(() => {
        return Array.from(new Set(transactions.flatMap(t => t.categories)));
    }, [transactions]);

    const sortedMovements = useMemo(() => {
        const search = normalizeForSearch(filters.search.trim());

        const filtered = transactions.filter(transaction => {
            if (search && !normalizeForSearch(transaction.title).includes(search)) {
                return false;
            }
            if (filters.category && !transaction.categories.includes(filters.category)) {
                return false;
            }
            if (
                filters.account &&
                transaction.accountId !== filters.account &&
                transaction.targetAccountId !== filters.account
            ) {
                return false;
            }
            return true;
        });

        const list = [...filtered];

        switch (filters.sort) {
            case "date-asc":
                return list.sort(compareTransactionsByMoment);
            case "date-desc":
                return list.sort((a, b) => compareTransactionsByMoment(b, a));
            case "price-asc":
                return list.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
            case "price-desc":
                return list.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
            default:
                return list;
        }
    }, [transactions, filters]);

    return (
        <section className="p-6 space-y-8">
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
                            {sortedMovements.map(transaction => (
                                <TransactionCard key={transaction.id} transaction={transaction} />
                            ))}
                        </ul>

                        {sortedMovements.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No se encontraron movimientos con estos filtros.
                            </p>
                        )}

                        {hasMore && (
                            <div className="flex justify-center pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isLoadingMore}
                                    onClick={() => loadMoreTransactions()}
                                >
                                    {isLoadingMore && <Loader2Icon className="animate-spin" />}
                                    Cargar más movimientos
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
