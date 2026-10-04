"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Grouping digits with dots as you type ("45000" -> "45.000") isn't possible
// with a native type="number" input — it only accepts a single decimal
// point and would misparse "45.000" as 45. So this is a plain text input:
// `value` stays the raw digit string (identical to what every caller already
// stored and passed to Number()), formatted only for display, and onChange
// strips any non-digit back out before handing it to the caller. Whole pesos
// only (no decimal entry) — this app's amounts are CLP, which has no cents
// in practice.
function formatThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

type Props = {
  value: string;
  onChange: (digits: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  className?: string;
  autoFocus?: boolean;
};

export const MoneyInput = forwardRef<HTMLInputElement, Props>(function MoneyInput(
  { value, onChange, onKeyDown, className, autoFocus },
  ref
) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
        $
      </span>
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={formatThousands(value)}
        onChange={e => onChange(e.target.value.replace(/\D/g, ""))}
        onKeyDown={onKeyDown}
        className={cn("pl-6", className)}
        autoFocus={autoFocus}
      />
    </div>
  );
});
