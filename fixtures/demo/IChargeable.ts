export interface IChargeable {
  charge(id: string, amount: number): Promise<boolean>;
}
