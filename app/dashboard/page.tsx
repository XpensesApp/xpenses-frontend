"use client";

import { useEffect, useMemo, useState } from "react";
import { useExpensesStore } from "@/store/expenses.store";
import { useAccountsStore } from "@/store/accounts.store";
import { useSubscriptionsStore } from "@/store/subscriptions.store";
import { usePaymentsStore } from "@/store/payments.store";
import { normalizeForSearch, cn } from "@/lib/utils";
import { computeBalances } from "@/features/expenses/balance";
import { ExpenseCard } from "@/features/expenses/components/ExpenseCard";
import { CreateExpenseDialog } from "@/features/expenses/components/CreateExpenseDialog";
import { UpcomingCardPayments } from "@/features/accounts/components/UpcomingCardPayments";
import {
    ExpenseFilters,
    ExpenseFiltersState,
    emptyExpenseFilters,
} from "@/features/expenses/components/ExpenseFilters";

export default function DashboardPage() {
    const { expenses, loadExpenses } = useExpensesStore();
    const loadAccounts = useAccountsStore(state => state.loadAccounts);
    const { loadSubscriptions, syncDueEntries } = useSubscriptionsStore();
    const { payments, loadPayments } = usePaymentsStore();
    const [filters, setFilters] = useState<ExpenseFiltersState>(emptyExpenseFilters);

    useEffect(() => {
        async function init() {
            await loadExpenses();
            await loadAccounts();
            await loadPayments();
            await loadSubscriptions();
            await syncDueEntries();
        }
        init();
    }, [loadExpenses, loadAccounts, loadPayments, loadSubscriptions, syncDueEntries]);

    const { actualBalance, debt, generalBalance } = useMemo(() => {
        return computeBalances(expenses, payments);
    }, [expenses, payments]);

    const categories = useMemo(() => {
        return Array.from(new Set(expenses.map(e => e.category).filter(Boolean)));
    }, [expenses]);

    const filteredExpenses = useMemo(() => {
        const search = normalizeForSearch(filters.search.trim());

        return expenses.filter(expense => {
            if (search && !normalizeForSearch(expense.title).includes(search)) {
                return false;
            }
            if (filters.category && expense.category !== filters.category) {
                return false;
            }
            return true;
        });
    }, [expenses, filters]);

    const sortedExpenses = useMemo(() => {
        const list = [...filteredExpenses];

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
    }, [filteredExpenses, filters.sort]);

    return (
        <section className="p-6 space-y-8">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1 rounded-lg border p-4">
                    <span className="text-sm font-medium text-muted-foreground">
                        Balance general
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
                        Balance actual
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

                <CreateExpenseDialog />
            </div>

            <div className="space-y-4 border-t pt-6">
                <h2 className="text-lg font-semibold">
                    Tus movimientos
                </h2>

                <ExpenseFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    categories={categories}
                />

                <ul className="space-y-2">
                    {sortedExpenses.map(expense => (
                        <ExpenseCard key={expense.id} expense={expense} />
                    ))}
                </ul>

                {sortedExpenses.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        No se encontraron movimientos con estos filtros.
                    </p>
                )}
            </div>
        </section>
    );
}
