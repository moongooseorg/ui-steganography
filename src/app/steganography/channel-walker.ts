export class ChannelWalker {
  private pixel = 0;
  private sub = 0;

  constructor(private readonly data: Uint8ClampedArray) {
    this.skipTransparent();
  }

  next(): number {
    if (this.pixel >= this.data.length) return -1;

    const index = this.pixel + this.sub;
    this.sub++;

    if (this.sub === 3) {
      this.sub = 0;
      this.pixel += 4;
      this.skipTransparent();
    }

    return index;
  }

  private skipTransparent(): void {
    while (this.pixel < this.data.length && this.data[this.pixel + 3] !== 255) {
      this.pixel += 4;
    }
  }
}

export function countUsableChannels(data: Uint8ClampedArray): number {
  let opaque = 0;
  for (let alpha = 3; alpha < data.length; alpha += 4) {
    if (data[alpha] === 255) opaque++;
  }
  return opaque * 3;
}
