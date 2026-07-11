import { PaymentGateway } from "./PaymentGateway";

export interface IChargeable {
  charge(id: string, amount: number): Promise<boolean>;
}

export interface ShippingContext {
  country: string;
}

export interface Address {
  city: string;
  district?: string;
  shipping?: ShippingContext;
}

export class OrderService implements IChargeable {
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

  describeStatus(status: string): string {
    switch (status) {
      case "pending":
        return "Awaiting payment";
      case "paid": {
        return "Payment received";
      }
      default:
        return "Unknown status";
    }
  }

  describeAddress(addr: Address): string {
    return addr.city ?? "Unknown city";
  }

  formatContactLine(addr: Address): string {
    const parts: string[] = [];
    parts.push(addr.city);
    parts.push(addr.shipping.country);
    return parts.join(", ");
  }
}

export class PremiumOrderService extends OrderService {
  async checkout(id: string): Promise<boolean> {
    const ok = await super.checkout(id);
    return ok;
  }
}

export class OrderValidator {
  validate(amount: number): boolean {
    return amount > 0 && Number.isFinite(amount);
  }
}
