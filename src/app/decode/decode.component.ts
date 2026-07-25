import { Component, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ImageDropComponent } from '../image-drop/image-drop.component';
import { decode, Payload } from '../steganography/codec';
import { downloadBlob, fileToImageData, formatBytes } from '../steganography/image-io';

type Phase = 'idle' | 'reading' | 'searching';

@Component({
  selector: 'app-decode',
  standalone: true,
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    ImageDropComponent,
  ],
  templateUrl: './decode.component.html',
  styleUrl: './decode.component.scss',
})
export class DecodeComponent {
  readonly carrierName = signal('');
  readonly phase = signal<Phase>('idle');
  readonly progress = signal(0);
  readonly error = signal('');
  readonly notFound = signal(false);
  readonly text = signal('');
  readonly fileSize = signal(0);
  readonly copied = signal(false);

  private carrier: ImageData | null = null;
  private payload: Payload | null = null;

  readonly format = formatBytes;

  get busy(): boolean {
    return this.phase() !== 'idle';
  }

  get hasImage(): boolean {
    return !!this.carrier;
  }

  get isFile(): boolean {
    return this.payload?.type === 'file';
  }

  get hasResult(): boolean {
    return !!this.payload;
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

  async run(): Promise<void> {
    if (!this.carrier || this.busy) return;

    this.clearResult();
    this.error.set('');
    this.progress.set(0);
    this.phase.set('searching');

    try {
      const found = await decode(this.carrier, (fraction) =>
        this.progress.set(fraction * 100)
      );
      if (!found) {
        this.notFound.set(true);
        return;
      }

      this.payload = found;
      if (found.type === 'text') {
        this.text.set(new TextDecoder().decode(found.bytes));
      } else {
        this.fileSize.set(found.bytes.length);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Decoding failed.');
    } finally {
      this.phase.set('idle');
      this.progress.set(0);
    }
  }

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.text());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.error.set('Clipboard access was blocked.');
    }
  }

  download(): void {
    if (!this.payload) return;
    const buffer = new ArrayBuffer(this.payload.bytes.length);
    new Uint8Array(buffer).set(this.payload.bytes);
    downloadBlob(new Blob([buffer], { type: 'application/octet-stream' }), 'hidden.bin');
  }

  private clearResult(): void {
    this.payload = null;
    this.text.set('');
    this.fileSize.set(0);
    this.notFound.set(false);
    this.copied.set(false);
  }
}
