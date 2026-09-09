"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExpenseDialog } from "@/features/expenses/components/ExpenseDialog";

export function CreateExpenseDialog() {
  const [quickName, setQuickName] = useState("");
  const [open, setOpen] = useState(false);

  function openDialog() {
    setOpen(true);
  }

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Nombre del gasto (ej. Café)"
        value={quickName}
        onChange={e => setQuickName(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") {
            openDialog();
          }
        }}
      />
      <Button onClick={openDialog}>
        Registrar
      </Button>

      <ExpenseDialog
        mode="create"
        initialTitle={quickName}
        open={open}
        onOpenChange={setOpen}
        onSaved={() => setQuickName("")}
      />
    </div>
  );
}
