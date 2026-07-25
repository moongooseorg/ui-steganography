import { Depth, DEPTHS, getLowBits, modifyLowBits } from './byte-modifier';
import { ChannelWalker, countUsableChannels } from './channel-walker';

export const HEADER_SIZE = 6;

const CHUNK_BYTES = 65536;

export type PayloadType = 'text' | 'file';

export interface Payload {
  type: PayloadType;
  bytes: Uint8Array;
}

export type ProgressFn = (fraction: number) => void;

export function capacity(data: Uint8ClampedArray, depth: Depth): number {
  const total = Math.floor((countUsableChannels(data) * depth) / 8);
  return Math.max(0, total - HEADER_SIZE);
}

export async function encode(
  image: ImageData,
  payload: Payload,
  depth: Depth,
  onProgress?: ProgressFn
): Promise<ImageData> {
  const limit = capacity(image.data, depth);
  if (payload.bytes.length > limit) {
    throw new Error(
      `That data is ${payload.bytes.length} bytes but this image holds ${limit} bytes at ${depth}-bit depth.`
    );
  }

  const framed = new Uint8Array(HEADER_SIZE + payload.bytes.length);
  framed[0] = payload.type === 'file' ? 1 : 0;
  framed[1] = depth;
  new DataView(framed.buffer).setUint32(2, payload.bytes.length, false);
  framed.set(payload.bytes, HEADER_SIZE);

  const copy = new ImageData(
    new Uint8ClampedArray(image.data),
    image.width,
    image.height
  );
  await writeBytes(copy.data, framed, depth, onProgress);
  return copy;
}

export async function decode(
  image: ImageData,
  onProgress?: ProgressFn
): Promise<Payload | null> {
  for (const depth of DEPTHS) {
    const walker = new ChannelWalker(image.data);

    const header = await readBytes(image.data, walker, HEADER_SIZE, depth);
    if (!header) continue;
    if (header[0] > 1) continue;
    if (header[1] !== depth) continue;

    const length = new DataView(header.buffer).getUint32(2, false);
    if (length === 0 || length > capacity(image.data, depth)) continue;

    const bytes = await readBytes(image.data, walker, length, depth, onProgress);
    if (!bytes) continue;

    return { type: header[0] === 1 ? 'file' : 'text', bytes };
  }

  return null;
}

async function writeBytes(
  data: Uint8ClampedArray,
  framed: Uint8Array,
  depth: Depth,
  onProgress?: ProgressFn
): Promise<void> {
  const walker = new ChannelWalker(data);
  const perByte = 8 / depth;

  for (let start = 0; start < framed.length; start += CHUNK_BYTES) {
    const end = Math.min(start + CHUNK_BYTES, framed.length);

    for (let i = start; i < end; i++) {
      const byte = framed[i];
      for (let slot = 0; slot < perByte; slot++) {
        const index = walker.next();
        if (index < 0) throw new Error('Ran out of image while writing the data.');
        data[index] = modifyLowBits(data[index], byte >> (8 - depth * (slot + 1)), depth);
      }
    }

    onProgress?.(end / framed.length);
    if (end < framed.length) await yieldToUi();
  }
}

async function readBytes(
  data: Uint8ClampedArray,
  walker: ChannelWalker,
  count: number,
  depth: Depth,
  onProgress?: ProgressFn
): Promise<Uint8Array | null> {
  const out = new Uint8Array(count);
  const perByte = 8 / depth;

  for (let start = 0; start < count; start += CHUNK_BYTES) {
    const end = Math.min(start + CHUNK_BYTES, count);

    for (let i = start; i < end; i++) {
      let byte = 0;
      for (let slot = 0; slot < perByte; slot++) {
        const index = walker.next();
        if (index < 0) return null;
        byte = (byte << depth) | getLowBits(data[index], depth);
      }
      out[i] = byte;
    }

    onProgress?.(end / count);
    if (end < count) await yieldToUi();
  }

  return out;
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
