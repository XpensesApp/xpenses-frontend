"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Transaction } from "@/features/transactions/transactions.types";

const UNCATEGORIZED = "Sin categoría";

// Single series (expense amount) across categories — one color, no legend
// (the card title already says what's plotted).
const chartConfig = {
  amount: {
    label: "Gasto",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

type CategoryTotal = { category: string; amount: number };

// A transaction can carry several category tags at once (see TransactionDialog) —
// each tag gets credit for the full amount, same as the category filter treats
// them as independent, non-exclusive labels. Pending entries (an unconfirmed
// subscription due) aren't real spend yet, so they're excluded.
function summarizeByCategory(transactions: Transaction[]): CategoryTotal[] {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense" || transaction.pending) continue;

    const categories = transaction.categories.length > 0 ? transaction.categories : [UNCATEGORIZED];
    for (const category of categories) {
      totals.set(category, (totals.get(category) ?? 0) + transaction.amount);
    }
  }

  return Array.from(totals, ([category, amount]) => ({ category, amount })).sort(
    (a, b) => b.amount - a.amount
  );
}

export function ExpensesByCategoryChart({ transactions }: { transactions: Transaction[] }) {
  const data = useMemo(() => summarizeByCategory(transactions), [transactions]);

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay gastos para resumir por categoría.
      </p>
    );
  }

  // Horizontal bars so long category names never need rotating; height grows
  // with the category count so the x-axis band is never squeezed out.
  const height = Math.max(160, data.length * 40 + 40);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} layout="vertical" margin={{ left: 12, right: 32 }}>
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={value => `$${Number(value).toLocaleString()}`}
        />
        <YAxis type="category" dataKey="category" tickLine={false} axisLine={false} width={110} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={value => `$${Number(value).toLocaleString()}`}
            />
          }
        />
        <Bar dataKey="amount" fill="var(--color-amount)" radius={[0, 4, 4, 0]} barSize={24}>
          <LabelList
            dataKey="amount"
            position="right"
            className="fill-foreground"
            formatter={(value: unknown) => `$${Number(value).toLocaleString()}`}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
