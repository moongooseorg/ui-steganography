import { Component, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ImageDropComponent } from '../image-drop/image-drop.component';
import { Depth, DEPTHS } from '../steganography/byte-modifier';
import { capacity, encode } from '../steganography/codec';
import {
  downloadBlob,
  fileToImageData,
  formatBytes,
  imageDataToPngBlob,
} from '../steganography/image-io';

type Mode = 'text' | 'file';
type Phase = 'idle' | 'reading' | 'hiding' | 'rendering';

@Component({
  selector: 'app-encode',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    ImageDropComponent,
  ],
  templateUrl: './encode.component.html',
  styleUrl: './encode.component.scss',
})
export class EncodeComponent {
  readonly depths = DEPTHS;

  readonly carrierName = signal('');
  readonly payloadName = signal('');
  readonly mode = signal<Mode>('text');
  readonly depth = signal<Depth>(2);
  readonly text = signal('');
  readonly phase = signal<Phase>('idle');
  readonly progress = signal(0);
  readonly error = signal('');
  readonly resultUrl = signal('');
  readonly resultSize = signal(0);
  readonly copied = signal(false);

  private carrier: ImageData | null = null;
  private payloadBytes: Uint8Array | null = null;
  private resultBlob: Blob | null = null;

  readonly format = formatBytes;

  get busy(): boolean {
    return this.phase() !== 'idle';
  }

  get phaseLabel(): string {
    switch (this.phase()) {
      case 'reading':
        return 'Reading image…';
      case 'hiding':
        return 'Hiding data…';
      case 'rendering':
        return 'Writing PNG…';
      default:
        return '';
    }
  }

  get capacityBytes(): number {
    return this.carrier ? capacity(this.carrier.data, this.depth()) : 0;
  }

  get payloadSize(): number {
    if (this.mode() === 'file') return this.payloadBytes?.length ?? 0;
    return new TextEncoder().encode(this.text()).length;
  }

  get usedPercent(): number {
    const limit = this.capacityBytes;
    if (!limit) return 0;
    return Math.min(100, (this.payloadSize / limit) * 100);
  }

  get overCapacity(): boolean {
    return !!this.carrier && this.payloadSize > this.capacityBytes;
  }

  get canEncode(): boolean {
    return !!this.carrier && this.payloadSize > 0 && !this.overCapacity && !this.busy;
  }

  async onCarrier(file: File): Promise<void> {
    this.clearResult();
    this.error.set('');
    this.phase.set('reading');
    try {
      this.carrier = await fileToImageData(file);
      this.carrierName.set(file.name);
    } catch {
      this.error.set('That file could not be read as an image.');
      this.carrier = null;
      this.carrierName.set('');
    } finally {
      this.phase.set('idle');
    }
  }

  async onPayloadFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.clearResult();
    this.payloadBytes = new Uint8Array(await file.arrayBuffer());
    this.payloadName.set(file.name);
  }

  onModeChange(mode: Mode): void {
    this.mode.set(mode);
    this.clearResult();
  }

  onDepthChange(depth: Depth): void {
    this.depth.set(depth);
    this.clearResult();
  }

  onTextChange(value: string): void {
    this.text.set(value);
    this.clearResult();
  }

  async run(): Promise<void> {
    if (!this.carrier || !this.canEncode) return;

    this.error.set('');
    this.progress.set(0);
    this.phase.set('hiding');

    try {
      const bytes =
        this.mode() === 'file'
          ? this.payloadBytes!
          : new TextEncoder().encode(this.text());

      const result = await encode(
        this.carrier,
        { type: this.mode(), bytes },
        this.depth(),
        (fraction) => this.progress.set(fraction * 100)
      );

      this.phase.set('rendering');
      const blob = await imageDataToPngBlob(result);

      this.clearResult();
      this.resultBlob = blob;
      this.resultUrl.set(URL.createObjectURL(blob));
      this.resultSize.set(blob.size);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Encoding failed.');
    } finally {
      this.phase.set('idle');
      this.progress.set(0);
    }
  }

  async copy(): Promise<void> {
    if (!this.resultBlob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': this.resultBlob }),
      ]);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.error.set('Clipboard access was blocked. Use Download instead.');
    }
  }

  download(): void {
    if (!this.resultBlob) return;
    downloadBlob(this.resultBlob, 'encoded.png');
  }

  private clearResult(): void {
    if (this.resultUrl()) URL.revokeObjectURL(this.resultUrl());
    this.resultUrl.set('');
    this.resultBlob = null;
    this.resultSize.set(0);
    this.copied.set(false);
  }
}
