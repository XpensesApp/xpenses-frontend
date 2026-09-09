"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useExpensesStore } from "@/store/expenses.store";
import { Expense, ExpenseType } from "@/features/expenses/expenses.types";

function nowLocalDateTime() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toDateTimeLocalValue(date: string) {
  return date.length === 10 ? `${date}T00:00` : date.slice(0, 16);
}

type CreateProps = {
  mode: "create";
  initialTitle?: string;
};

type EditProps = {
  mode: "edit";
  expense: Expense;
};

type Props = (CreateProps | EditProps) & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function ExpenseDialog(props: Props) {
  const { open, onOpenChange, onSaved } = props;

  const addExpense = useExpensesStore(state => state.addExpense);
  const updateExpense = useExpensesStore(state => state.updateExpense);

  const [type, setType] = useState<ExpenseType>("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(nowLocalDateTime());

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountRef = useRef<HTMLInputElement>(null);

  function handleOpenAutoFocus(e: Event) {
    e.preventDefault();

    if (props.mode === "edit") {
      setType(props.expense.type);
      setTitle(props.expense.title);
      setAmount(String(props.expense.amount));
      setCategory(props.expense.category);
      setDate(toDateTimeLocalValue(props.expense.date));
    } else {
      setType("expense");
      setTitle(props.initialTitle?.trim() ?? "");
      setAmount("");
      setCategory("");
      setDate(nowLocalDateTime());
    }

    setError(null);
    amountRef.current?.focus();
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    const parsedAmount = Number(amount);

    if (!trimmedTitle) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Ingresa un precio válido.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (props.mode === "edit") {
        await updateExpense({
          ...props.expense,
          type,
          title: trimmedTitle,
          amount: parsedAmount,
          category: category.trim(),
          date,
        });
      } else {
        await addExpense({
          id: crypto.randomUUID(),
          type,
          title: trimmedTitle,
          amount: parsedAmount,
          category: category.trim(),
          date,
        });
      }

      onOpenChange(false);
      onSaved?.();
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={handleOpenAutoFocus}>
        <DialogHeader>
          <DialogTitle>
            {props.mode === "edit" ? "Editar movimiento" : "Nuevo movimiento"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === "expense" ? "default" : "outline"}
                size="sm"
                onClick={() => setType("expense")}
              >
                Gasto
              </Button>
              <Button
                type="button"
                variant={type === "income" ? "default" : "outline"}
                size="sm"
                onClick={() => setType("income")}
              >
                Ingreso
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Precio</label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                ref={amountRef}
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleSave();
                }}
                className="pl-6 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:[-webkit-appearance:none] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:[-webkit-appearance:none]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Categoría (opcional)</label>
            <Input
              value={category}
              onChange={e => setCategory(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Fecha y hora</label>
            <Input
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="[&::-webkit-calendar-picker-indicator]:size-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
