import { PaymentGateway } from "./PaymentGateway";

export class OrderService {
  private orders: Map<string, number> = new Map();

  constructor(private gateway: PaymentGateway) {}

  createOrder(id: string, amount: number): void {
    this.orders.set(id, amount);
  }

  async checkout(id: string): Promise<boolean> {
    const amount = this.orders.get(id);
    if (amount === undefined) return false;
    return this.gateway.charge(id, amount);
  }

  cancelOrder(id: string): boolean {
    return this.orders.delete(id);
  }
}

export class OrderValidator {
  validate(amount: number): boolean {
    return amount > 0 && Number.isFinite(amount);
  }
}
