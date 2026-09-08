"use client";

import { useEffect } from "react";
import { useExpensesStore } from "@/store/expenses.store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  const { expenses, loadExpenses } = useExpensesStore();

  useEffect(() => {
    loadExpenses();
  }, []);

  return (
    <section className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tus gastos</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          {expenses.map(expense => (
            <div
              key={expense.id}
              className="flex justify-between border-b pb-2 last:border-0"
            >
              <span>{expense.title}</span>
              <span className="font-medium">
                ${expense.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
