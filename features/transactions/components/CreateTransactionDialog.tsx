"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TransactionDialog } from "@/features/transactions/components/TransactionDialog";

export function CreateTransactionDialog() {
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

      <TransactionDialog
        mode="create"
        initialTitle={quickName}
        open={open}
        onOpenChange={setOpen}
        onSaved={() => setQuickName("")}
      />
    </div>
  );
}
