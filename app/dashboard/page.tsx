"use client";

import { useEffect } from "react";
import { useExpensesStore } from "@/store/expenses.store";
import { ExpenseCard } from "@/features/expenses/components/ExpenseCard";

export default function DashboardPage() {
    const { expenses, loadExpenses } = useExpensesStore();

    useEffect(() => {
        loadExpenses();
    }, [loadExpenses]);

    return (
        <section className="p-6">
            <h2 className="text-xl font-semibold mb-4">
                Tus gastos
            </h2>

            <ul className="space-y-2">
                {expenses.map(expense => (
                    <ExpenseCard key={expense.id} expense={expense} />
                ))}

            </ul>
        </section>
    );
}
