"use client";

import { useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscriptionsStore } from "@/store/subscriptions.store";
import { useExpensesStore } from "@/store/expenses.store";
import { SubscriptionCard } from "@/features/subscriptions/components/SubscriptionCard";
import { SubscriptionDialog } from "@/features/subscriptions/components/SubscriptionDialog";

export default function SubscriptionsPage() {
    const { subscriptions, loadSubscriptions, syncDueEntries } = useSubscriptionsStore();
    const loadExpenses = useExpensesStore(state => state.loadExpenses);
    const [createOpen, setCreateOpen] = useState(false);

    useEffect(() => {
        async function init() {
            await Promise.all([loadExpenses(), loadSubscriptions()]);
            await syncDueEntries();
        }
        init();
    }, [loadExpenses, loadSubscriptions, syncDueEntries]);

    return (
        <section className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Suscripciones</h2>

                <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <PlusIcon />
                    Agregar suscripción
                </Button>
            </div>

            <ul className="space-y-2">
                {subscriptions.map(subscription => (
                    <SubscriptionCard key={subscription.id} subscription={subscription} />
                ))}
            </ul>

            {subscriptions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Aún no has agregado suscripciones.
                </p>
            )}

            <SubscriptionDialog
                mode="create"
                open={createOpen}
                onOpenChange={setCreateOpen}
            />
        </section>
    );
}
