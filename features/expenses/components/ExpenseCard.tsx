import { Card, CardContent } from "@/components/ui/card";
import { cva } from "class-variance-authority";
import { Expense } from "../expenses.types";

const expenseCardVariants = cva(
  "border transition-colors",
  {
    variants: {
      variant: {
        default: "bg-background",
        food: "bg-emerald-50 border-emerald-200",
        housing: "bg-blue-50 border-blue-200",
        subscription: "bg-purple-50 border-purple-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type Props = {
  expense: Expense;
};

export function ExpenseCard({ expense }: Props) {
  const variant = getVariantByCategory(expense.category);

  return (
    <Card className={expenseCardVariants({ variant })}>
      <CardContent className="p-4 flex justify-between">
        <span>{expense.title}</span>
        <span>${expense.amount.toLocaleString()}</span>
      </CardContent>
    </Card>
  );
}

function getVariantByCategory(category: string) {
  switch (category) {
    case "Comida":
      return "food";
    case "Vivienda":
      return "housing";
    case "Suscripciones":
      return "subscription";
    default:
      return "default";
  }
}
