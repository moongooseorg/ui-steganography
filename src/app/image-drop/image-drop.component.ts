import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-image-drop',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './image-drop.component.html',
  styleUrl: './image-drop.component.scss',
})
export class ImageDropComponent {
  @Input() label = 'Drop an image here';
  @Input() accept = 'image/png,image/jpeg,image/bmp,image/webp';
  @Input() filename = '';
  @Output() fileSelected = new EventEmitter<File>();

  dragging = false;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging = true;
  }

  onDragLeave(): void {
    this.dragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.fileSelected.emit(file);
  }

  onBrowse(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.fileSelected.emit(file);
    input.value = '';
  }
}
