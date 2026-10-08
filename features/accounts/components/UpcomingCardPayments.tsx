"use client";

import { useTransactionsStore } from "@/store/transactions.store";
import { TransactionCard } from "@/features/transactions/components/TransactionCard";

/**
 * Pending credit-card statements, surfaced directly on the movements page
 * instead of only inside the full list. Each one is a regular transaction
 * the backend's statements job generates (see `Transaction.statement`), so
 * this just finds and renders them — same `TransactionCard`, same "Pagar"
 * flow, as anywhere else they'd show up.
 */
export function UpcomingCardPayments() {
  const transactions = useTransactionsStore(state => state.transactions);

  const pendingStatements = transactions
    .filter(t => t.pending && t.statement)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (pendingStatements.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Pagos de tarjeta pendientes</h2>

      <ul className="space-y-2">
        {pendingStatements.map(statement => (
          <TransactionCard key={statement.id} transaction={statement} />
        ))}
      </ul>
    </div>
  );
}
