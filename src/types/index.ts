export interface Note {
  id: string;
  pitch: string;
  startTime: number;
  duration: number;
}

export interface Meter {
  beatsPerMeasure: number;
  beatUnit: number;
}

export interface Song {
  tempo: number;
  meter: Meter;
  key: string;
  notes: Note[];
}

export type NoteDuration = 0.25 | 0.5 | 1 | 2 | 4;

export const NOTE_COLORS: Record<string, string> = {
  C: '#e74c3c',
  D: '#e67e22',
  E: '#f1c40f',
  F: '#2ecc71',
  G: '#1abc9c',
  A: '#9b59b6',
  B: '#e91e63',
};

export const MAJOR_SCALES: Record<string, string[]> = {
  'C Major': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  'G Major': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  'D Major': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  'A Major': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
  'E Major': ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
  'B Major': ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
  'F Major': ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
  'Bb Major': ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
  'Eb Major': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
  'Ab Major': ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
  'Db Major': ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
  'Gb Major': ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'],
};

export const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];