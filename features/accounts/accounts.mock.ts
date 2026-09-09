import { Account } from "./accounts.types";

export const mockAccounts: Account[] = [
  {
    id: "1",
    name: "CMR",
    type: "credit",
    paymentDay: 5,
  },
  {
    id: "2",
    name: "Cuenta Corriente",
    type: "debit",
  },
  {
    id: "3",
    name: "Efectivo",
    type: "cash",
  },
];
