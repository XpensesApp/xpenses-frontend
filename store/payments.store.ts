import { create } from "zustand";
import { Payment } from "@/features/payments/payments.types";
import { paymentsService } from "@/features/payments/payments.service";

type PaymentsState = {
  payments: Payment[];
  loadPayments: () => Promise<void>;
  addPayment: (payment: Payment) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
};

export const usePaymentsStore = create<PaymentsState>((set) => ({
  payments: [],

  loadPayments: async () => {
    const data = await paymentsService.getAll();
    set({ payments: data });
  },

  addPayment: async (payment) => {
    await paymentsService.create(payment);
    set(state => ({
      payments: [payment, ...state.payments],
    }));
  },

  deletePayment: async (id) => {
    await paymentsService.delete(id);
    set(state => ({
      payments: state.payments.filter(p => p.id !== id),
    }));
  },
}));
