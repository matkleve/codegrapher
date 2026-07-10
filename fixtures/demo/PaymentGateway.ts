export class PaymentGateway {
  private retries = 3;

  async charge(orderId: string, amount: number): Promise<boolean> {
    for (let attempt = 0; attempt < this.retries; attempt++) {
      if (await this.send(orderId, amount)) return true;
    }
    return false;
  }

  private async send(orderId: string, amount: number): Promise<boolean> {
    return amount < 10_000;
  }
}
