import { Component, inject } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';

import { EncodeComponent } from './encode/encode.component';
import { DecodeComponent } from './decode/decode.component';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MatTabsModule, MatIconModule, EncodeComponent, DecodeComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private themeService = inject(ThemeService);
}
