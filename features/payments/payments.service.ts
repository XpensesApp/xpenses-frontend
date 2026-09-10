import { Payment } from "./payments.types";
import { mockPayments } from "./payments.mock";

let payments = [...mockPayments];

export const paymentsService = {
  getAll: async (): Promise<Payment[]> => {
    await delay(300);
    return payments;
  },

  create: async (payment: Payment): Promise<Payment> => {
    await delay(300);
    payments = [payment, ...payments];
    return payment;
  },

  delete: async (id: string): Promise<void> => {
    await delay(300);
    payments = payments.filter(p => p.id !== id);
  },
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
