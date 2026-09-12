"use client";

import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExpensesStore } from "@/store/expenses.store";
import { useAccountsStore } from "@/store/accounts.store";
import { useSubscriptionsStore } from "@/store/subscriptions.store";
import { usePaymentsStore } from "@/store/payments.store";
import { normalizeForSearch, cn } from "@/lib/utils";
import { computeBalances } from "@/features/expenses/balance";
import { ExpenseCard } from "@/features/expenses/components/ExpenseCard";
import { CreateExpenseDialog } from "@/features/expenses/components/CreateExpenseDialog";
import { PaymentCard } from "@/features/payments/components/PaymentCard";
import { UpcomingCardPayments } from "@/features/accounts/components/UpcomingCardPayments";
import {
    ExpenseFilters,
    ExpenseFiltersState,
    emptyExpenseFilters,
} from "@/features/expenses/components/ExpenseFilters";

export default function DashboardPage() {
    const { expenses, loadExpenses } = useExpensesStore();
    const { accounts, loadAccounts } = useAccountsStore();
    const { loadSubscriptions, syncDueEntries } = useSubscriptionsStore();
    const { payments, loadPayments } = usePaymentsStore();
    const [filters, setFilters] = useState<ExpenseFiltersState>(emptyExpenseFilters);
    const [showFilters, setShowFilters] = useState(false);
    const hasActiveFilters =
        filters.search !== "" || filters.category !== "" || filters.account !== "";

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
        return Array.from(new Set(expenses.flatMap(e => e.categories)));
    }, [expenses]);

    // Credit-card payments are movements too (a real cash outflow), shown
    // alongside expenses in the same list — but they have no title/category
    // of their own, so search matches a synthetic "pago <card>" label and a
    // category filter always excludes them, same as an uncategorized expense.
    const movements = useMemo(() => {
        const search = normalizeForSearch(filters.search.trim());

        const filteredExpenses = expenses.filter(expense => {
            if (search && !normalizeForSearch(expense.title).includes(search)) {
                return false;
            }
            if (filters.category && !expense.categories.includes(filters.category)) {
                return false;
            }
            if (filters.account && expense.accountId !== filters.account) {
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
            ...filteredExpenses.map(expense => ({
                kind: "expense" as const,
                id: expense.id,
                date: expense.date,
                amount: expense.amount,
                expense,
            })),
            ...filteredPayments.map(payment => ({
                kind: "payment" as const,
                id: payment.id,
                date: payment.date,
                amount: payment.amount,
                payment,
            })),
        ];
    }, [expenses, payments, accounts, filters]);

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
                    <ExpenseFilters
                        filters={filters}
                        onFiltersChange={setFilters}
                        categories={categories}
                        accounts={accounts}
                    />
                )}

                <ul className="space-y-2">
                    {sortedMovements.map(movement =>
                        movement.kind === "expense" ? (
                            <ExpenseCard key={`expense-${movement.id}`} expense={movement.expense} />
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
            </div>
        </section>
    );
}
