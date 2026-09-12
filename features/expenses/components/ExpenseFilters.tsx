"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Account } from "@/features/accounts/accounts.types";

export type ExpenseSortOption =
  | "date-asc"
  | "date-desc"
  | "price-asc"
  | "price-desc";

export type ExpenseFiltersState = {
  search: string;
  category: string;
  account: string;
  sort: ExpenseSortOption;
};

export const emptyExpenseFilters: ExpenseFiltersState = {
  search: "",
  category: "",
  account: "",
  sort: "date-desc",
};

const sortOptions: { value: ExpenseSortOption; label: string }[] = [
  { value: "date-desc", label: "Fecha (más reciente primero)" },
  { value: "date-asc", label: "Fecha (más antigua primero)" },
  { value: "price-desc", label: "Precio (mayor a menor)" },
  { value: "price-asc", label: "Precio (menor a mayor)" },
];

type Props = {
  filters: ExpenseFiltersState;
  onFiltersChange: (filters: ExpenseFiltersState) => void;
  categories: string[];
  accounts: Account[];
};

export function ExpenseFilters({ filters, onFiltersChange, categories, accounts }: Props) {
  function update<K extends keyof ExpenseFiltersState>(
    key: K,
    value: ExpenseFiltersState[K]
  ) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[180px] flex-1 space-y-1">
        <label className="text-sm font-medium">Buscar</label>
        <Input
          placeholder="Buscar por nombre"
          value={filters.search}
          onChange={e => update("search", e.target.value)}
        />
      </div>

      <div className="w-40 space-y-1">
        <label className="text-sm font-medium">Categoría</label>
        <Select
          value={filters.category === "" ? "all" : filters.category}
          onValueChange={value =>
            update("category", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-40 space-y-1">
        <label className="text-sm font-medium">Cuenta</label>
        <Select
          value={filters.account === "" ? "all" : filters.account}
          onValueChange={value =>
            update("account", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {accounts.map(account => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-56 space-y-1">
        <label className="text-sm font-medium">Ordenar por</label>
        <Select
          value={filters.sort}
          onValueChange={value => update("sort", value as ExpenseSortOption)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFiltersChange(emptyExpenseFilters)}
      >
        Limpiar filtros
      </Button>
    </div>
  );
}
