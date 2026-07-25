export type Depth = 1 | 2 | 4;

export const DEPTHS: Depth[] = [1, 2, 4];

export function maskFor(depth: Depth): number {
  return (1 << depth) - 1;
}

export function modifyLowBits(byte: number, bits: number, depth: Depth): number {
  const mask = maskFor(depth);
  return (byte & ~mask & 0xff) | (bits & mask);
}

export function getLowBits(byte: number, depth: Depth): number {
  return byte & maskFor(depth);
}
