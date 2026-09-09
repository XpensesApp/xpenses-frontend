"use client";

import { useEffect, useMemo, useState } from "react";
import { useExpensesStore } from "@/store/expenses.store";
import { normalizeForSearch } from "@/lib/utils";
import { ExpenseCard } from "@/features/expenses/components/ExpenseCard";
import { CreateExpenseDialog } from "@/features/expenses/components/CreateExpenseDialog";
import {
    ExpenseFilters,
    ExpenseFiltersState,
    emptyExpenseFilters,
} from "@/features/expenses/components/ExpenseFilters";

export default function DashboardPage() {
    const { expenses, loadExpenses } = useExpensesStore();
    const [filters, setFilters] = useState<ExpenseFiltersState>(emptyExpenseFilters);

    useEffect(() => {
        loadExpenses();
    }, [loadExpenses]);

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
