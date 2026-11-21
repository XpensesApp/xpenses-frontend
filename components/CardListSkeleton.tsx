import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Placeholder for the lists of TransactionCard / AccountCard / SubscriptionCard:
// same card shell and the same two-line + amount + action-button layout, with
// the vertical margins sized so a row is as tall as a real one (no layout jump
// when the data arrives).
export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-busy="true" className="space-y-2">
      <span className="sr-only">Cargando...</span>
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} className="py-0" aria-hidden>
          <CardContent className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <Skeleton className="my-1 h-4 w-40 max-w-full" />
              <Skeleton className="my-0.5 h-3 w-28 max-w-full" />
            </div>
            <Skeleton className="h-4 w-16 shrink-0" />
            <Skeleton className="size-8 shrink-0" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
