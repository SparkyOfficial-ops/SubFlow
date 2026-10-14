import { Address } from "@ton/core";

export function sameAddress(left: string, right: string): boolean {
  try {
    return Address.parse(left).equals(Address.parse(right));
  } catch {
    return left === right;
  }
}
