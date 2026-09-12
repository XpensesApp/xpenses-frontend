import { Account } from "./accounts.types";

export const mockAccounts: Account[] = [
  {
    id: "1",
    name: "Banco Estado ahorro vivienda",
    type: "debit",
  },
  {
    id: "2",
    name: "Banco de Chile cta corriente",
    type: "debit",
  },
  {
    id: "3",
    name: "Copec Pay debito",
    type: "debit",
  },
  {
    id: "4",
    name: "Mach debito",
    type: "debit",
  },
  {
    id: "5",
    name: "CMR",
    type: "credit",
    paymentDay: 5,
  },
  {
    id: "6",
    name: "Cuenta RUT",
    type: "debit",
  },
  {
    id: "7",
    name: "Efectivo",
    type: "cash",
  },
];
