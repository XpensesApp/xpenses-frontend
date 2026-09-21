import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <div className="flex justify-center py-8">
      <Loader2Icon className={cn("size-6 animate-spin text-muted-foreground", className)} />
    </div>
  );
}
