"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAccountsStore } from "@/store/accounts.store";
import { usePaymentsStore } from "@/store/payments.store";
import { formatDateTime } from "@/lib/dates";
import { Payment } from "../payments.types";

type Props = {
  payment: Payment;
};

export function PaymentCard({ payment }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cardAccount = useAccountsStore(state =>
    state.accounts.find(a => a.id === payment.cardAccountId)
  );
  const sourceAccount = useAccountsStore(state =>
    state.accounts.find(a => a.id === payment.sourceAccountId)
  );
  const deletePayment = usePaymentsStore(state => state.deletePayment);

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await deletePayment(payment.id);
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-3 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="min-w-0 truncate font-medium">
              Pago {cardAccount?.name ?? "tarjeta"}
            </span>
            <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
              {sourceAccount ? sourceAccount.name : "Sin cuenta"}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(payment.date)}
          </span>
        </div>

        <span className="shrink-0 font-medium tabular-nums text-expense">
          -${payment.amount.toLocaleString()}
        </span>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Cancelar pago"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2Icon />
        </Button>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar pago</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            ¿Cancelar el pago de ${payment.amount.toLocaleString()} a{" "}
            {cardAccount?.name ?? "esta tarjeta"} del {formatDateTime(payment.date)}? La
            deuda de la tarjeta volverá a reflejar este monto como pendiente.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Volver
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Cancelando..." : "Cancelar pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
