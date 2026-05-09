import { Injectable } from '@angular/core';
import { ASL_VOCABULARY } from '../constants/asl-vocabulary';

export interface PoseToken {
  word: string;       // display label (original casing)
  key: string;        // normalised uppercase key used for file lookup
  poseUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class SignPoseService {
  private available = new Set<string>();
  private loaded = false;

  async loadManifest(): Promise<void> {
    if (this.loaded) return;
    try {
      const resp = await fetch('/assets/poses/manifest.json');
      if (resp.ok) {
        const manifest: { words?: string[] } = await resp.json();
        for (const w of manifest.words ?? []) {
          this.available.add(w.toUpperCase());
        }
      }
    } catch {
      // manifest not yet generated — all words show as unavailable
    }
    this.loaded = true;
  }

  hasWord(word: string): boolean {
    return this.available.has(this.normalise(word));
  }

  getPoseUrl(word: string): string | null {
    const key = this.normalise(word);
    if (!this.available.has(key)) return null;
    return `/assets/poses/${key.toLowerCase()}.pose`;
  }

  // Returns all 250 vocabulary words with availability status for the dictionary.
  getVocabulary(): { name: string; available: boolean }[] {
    return ASL_VOCABULARY.map(name => ({
      name,
      available: this.available.has(this.normalise(name)),
    }));
  }

  // Multi-word phrases that map to a single Kaggle sign token.
  private static readonly COMPOUNDS: [string, string][] = [
    ['thank you',     'thankyou'],
    ['french fries',  'frenchfries'],
    ['call on phone', 'callonphone'],
    ['glass window',  'glasswindow'],
    ['he she it',     'hesheit'],
    ['have to',       'haveto'],
    ['mine my',       'minemy'],
    ['we us',         'weus'],
  ];

  // Break input text into tokens, merging known compound phrases first.
  tokenize(text: string): PoseToken[] {
    let input = text.trim().toLowerCase();
    for (const [phrase, token] of SignPoseService.COMPOUNDS) {
      input = input.split(phrase).join(token);
    }
    return input
      .split(/\s+/)
      .filter(w => w.length > 0)
      .map(word => {
        const key = this.normalise(word);
        return { word, key, poseUrl: this.getPoseUrl(key) };
      });
  }

  private normalise(word: string): string {
    return word.replace(/[^a-zA-Z]/g, '').toUpperCase();
  }
}
