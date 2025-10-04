export interface Note {
  id: string;
  pitch: string;
  startTime: number;
  duration: number;
  durationComponents?: NoteDuration[]; // Array of duration values that sum to duration
}

export interface Chord {
  id: string;
  roman: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII';
  startTime: number;
  duration: number;
  durationComponents?: NoteDuration[]; // Array of duration values that sum to duration
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
  chords: Chord[];
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

/**
 * Get chord information for a given Roman numeral in a specific key
 */
export function getChordInfo(roman: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII', key: string): {
  name: string;
  quality: 'major' | 'minor' | 'diminished';
  color: string;
} {
  const scaleNotes = MAJOR_SCALES[key] || MAJOR_SCALES['C Major'];
  const romanToIndex: Record<string, number> = {
    'I': 0, 'II': 1, 'III': 2, 'IV': 3, 'V': 4, 'VI': 5, 'VII': 6
  };

  const degree = romanToIndex[roman];
  const rootNote = scaleNotes[degree];

  // In major scale: I, IV, V are major; II, III, VI are minor; VII is diminished
  let quality: 'major' | 'minor' | 'diminished';
  if (roman === 'I' || roman === 'IV' || roman === 'V') {
    quality = 'major';
  } else if (roman === 'VII') {
    quality = 'diminished';
  } else {
    quality = 'minor';
  }

  const noteColor = NOTE_COLORS[rootNote.replace('#', '').replace('b', '')] || '#888';

  return {
    name: rootNote,
    quality,
    color: noteColor
  };
}

/**
 * Get the notes that make up a chord (triad)
 */
export function getChordNotes(roman: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII', key: string): string[] {
  const scaleNotes = MAJOR_SCALES[key] || MAJOR_SCALES['C Major'];
  const romanToIndex: Record<string, number> = {
    'I': 0, 'II': 1, 'III': 2, 'IV': 3, 'V': 4, 'VI': 5, 'VII': 6
  };

  const degree = romanToIndex[roman];
  const rootNote = scaleNotes[degree];
  const thirdNote = scaleNotes[(degree + 2) % 7];
  const fifthNote = scaleNotes[(degree + 4) % 7];

  return [rootNote, thirdNote, fifthNote];
}

/**
 * Convert a duration value into an array of duration components
 * Uses greedy algorithm to break down into standard durations
 */
export function durationToComponents(duration: number): NoteDuration[] {
  const availableDurations: NoteDuration[] = [4, 2, 1, 0.5, 0.25];
  const components: NoteDuration[] = [];
  let remaining = duration;

  for (const d of availableDurations) {
    while (remaining >= d && remaining - d >= -0.001) { // Small epsilon for floating point
      components.push(d);
      remaining -= d;
    }
  }

  // If we have a remainder, it means the duration doesn't fit standard components
  // In this case, just return the original duration as a single component
  if (Math.abs(remaining) > 0.001) {
    return [duration as NoteDuration];
  }

  return components.sort((a, b) => b - a); // Sort descending
}