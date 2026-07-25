import { Injectable } from '@angular/core';

export type Theme = 'light-theme' | 'dark-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private theme: Theme = (localStorage.getItem('theme') as Theme) || 'dark-theme';

  constructor() {
    this.apply(this.theme);

    window.addEventListener('storage', (event) => {
      if (event.key === 'theme' && event.newValue && event.newValue !== this.theme) {
        location.reload();
      }
    });
  }

  get colorTheme(): 'light' | 'dark' {
    return this.theme === 'light-theme' ? 'light' : 'dark';
  }

  private apply(theme: Theme): void {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(theme);
  }
}
