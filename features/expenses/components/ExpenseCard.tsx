"use client";

import { useState } from "react";
import { PencilIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Expense } from "../expenses.types";
import { ExpenseDialog } from "./ExpenseDialog";

type Props = {
  expense: Expense;
};

export function ExpenseCard({ expense }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const isIncome = expense.type === "income";

  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-3 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-medium">{expense.title}</span>
            {expense.category && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {expense.category}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatExpenseDate(expense.date)}
          </span>
        </div>

        <span
          className={`shrink-0 font-medium tabular-nums ${
            isIncome ? "text-income" : "text-expense"
          }`}
        >
          {isIncome ? "+" : "-"}${expense.amount.toLocaleString()}
        </span>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Editar movimiento"
          onClick={() => setEditOpen(true)}
        >
          <PencilIcon />
        </Button>
      </CardContent>

      <ExpenseDialog
        mode="edit"
        expense={expense}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </Card>
  );
}

function formatExpenseDate(date: string) {
  if (date.length > 10) {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleDateString();
}
