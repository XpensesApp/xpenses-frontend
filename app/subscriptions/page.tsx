"use client";

import { useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardListSkeleton } from "@/components/CardListSkeleton";
import { useSubscriptionsStore } from "@/store/subscriptions.store";
import { useAccountsStore } from "@/store/accounts.store";
import { SubscriptionCard } from "@/features/subscriptions/components/SubscriptionCard";
import { SubscriptionDialog } from "@/features/subscriptions/components/SubscriptionDialog";

export default function SubscriptionsPage() {
    const { subscriptions, loadSubscriptions } = useSubscriptionsStore();
    const loadAccounts = useAccountsStore(state => state.loadAccounts);
    const [createOpen, setCreateOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);

    // A failed load must not read as "no subscriptions yet", so it gets its own
    // state (with a retry) instead of falling through to the empty-list message.
    function handleRetry() {
        setLoadFailed(false);
        setIsLoading(true);
        loadSubscriptions()
            .catch(error => {
                console.error("Could not load subscriptions:", error);
                setLoadFailed(true);
            })
            .finally(() => setIsLoading(false));
    }

    useEffect(() => {
        loadSubscriptions()
            .catch(error => {
                console.error("Could not load subscriptions:", error);
                setLoadFailed(true);
            })
            .finally(() => setIsLoading(false));
        // "Registrar pago" opens the movement form, which preselects the
        // user's preferred account — it needs the accounts loaded. Best-effort:
        // the page itself doesn't depend on them.
        loadAccounts().catch(() => {});
    }, [loadSubscriptions, loadAccounts]);

    return (
        <section className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Suscripciones</h2>

                <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <PlusIcon />
                    Agregar suscripción
                </Button>
            </div>

            {isLoading ? (
                <CardListSkeleton count={3} />
            ) : loadFailed ? (
                <div className="flex flex-col items-start gap-2 text-sm">
                    <p className="text-destructive">No se pudieron cargar las suscripciones.</p>
                    <Button variant="outline" size="sm" onClick={handleRetry}>
                        Reintentar
                    </Button>
                </div>
            ) : (
                <>
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
                </>
            )}

            <SubscriptionDialog
                mode="create"
                open={createOpen}
                onOpenChange={setCreateOpen}
            />
        </section>
    );
}
