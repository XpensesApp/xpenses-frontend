"use client";

import { XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  categories: string[];
  onCategoriesChange: (categories: string[]) => void;
  /** What's typed in the field but not yet turned into a chip — owned by the parent so a save can still pick it up (see `withPendingCategory`). */
  input: string;
  onInputChange: (input: string) => void;
};

// Free-text, multi-value category field: Enter or "," turns what's typed into a
// removable chip. Shared by the transaction and subscription dialogs, which both
// store a list of categories.
export function CategoriesInput({ categories, onCategoriesChange, input, onInputChange }: Props) {
  function addCategory(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!categories.includes(trimmed)) onCategoriesChange([...categories, trimmed]);
    onInputChange("");
  }

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">Categorías (opcional)</label>
      <Input
        value={input}
        onChange={e => onInputChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addCategory(input);
          }
        }}
        placeholder="Escribe y presiona Enter"
      />
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {categories.map(category => (
            <span
              key={category}
              className="flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              {category}
              <button
                type="button"
                onClick={() => onCategoriesChange(categories.filter(c => c !== category))}
                aria-label={`Quitar categoría ${category}`}
                className="hover:text-foreground"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** The categories to save: the chips, plus whatever is still typed in the field (the user may hit Save without pressing Enter first). */
export function withPendingCategory(categories: string[], input: string): string[] {
  const pending = input.trim();
  return pending && !categories.includes(pending) ? [...categories, pending] : categories;
}
