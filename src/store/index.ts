import { create } from 'zustand';
import { Song, Note, NoteDuration } from '../types';

interface AppState {
  song: Song;
  isPlaying: boolean;
  currentBeat: number;
  cursorPosition: number;
  selectedDuration: NoteDuration;
  isChromatic: boolean;
  selectedNoteId: string | null;

  setTempo: (tempo: number) => void;
  setMeter: (beatsPerMeasure: number) => void;
  setKey: (key: string) => void;
  addNote: (note: Omit<Note, 'id'>) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentBeat: (beat: number) => void;
  setCursorPosition: (position: number) => void;
  setSelectedDuration: (duration: NoteDuration) => void;
  setIsChromatic: (isChromatic: boolean) => void;
  setSelectedNoteId: (id: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  song: {
    tempo: 120,
    meter: {
      beatsPerMeasure: 4,
      beatUnit: 4,
    },
    key: 'C Major',
    notes: [],
  },
  isPlaying: false,
  currentBeat: 0,
  cursorPosition: 0,
  selectedDuration: 1,
  isChromatic: false,
  selectedNoteId: null,

  setTempo: (tempo) => set((state) => ({
    song: { ...state.song, tempo }
  })),

  setMeter: (beatsPerMeasure) => set((state) => ({
    song: {
      ...state.song,
      meter: { ...state.song.meter, beatsPerMeasure }
    }
  })),

  setKey: (key) => set((state) => {
    const oldKey = state.song.key;
    const transposedNotes = transposeNotes(state.song.notes, oldKey, key);
    return {
      song: { ...state.song, key, notes: transposedNotes }
    };
  }),

  addNote: (noteData) => set((state) => {
    const newId = crypto.randomUUID();
    return {
      song: {
        ...state.song,
        notes: [...state.song.notes, { ...noteData, id: newId }]
      },
      selectedNoteId: newId,
      selectedDuration: noteData.duration as NoteDuration,
      cursorPosition: noteData.startTime + noteData.duration
    };
  }),

  updateNote: (id, updates) => set((state) => ({
    song: {
      ...state.song,
      notes: state.song.notes.map((note) =>
        note.id === id ? { ...note, ...updates } : note
      )
    }
  })),

  deleteNote: (id) => set((state) => ({
    song: {
      ...state.song,
      notes: state.song.notes.filter((note) => note.id !== id)
    }
  })),

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentBeat: (currentBeat) => set({ currentBeat }),
  setCursorPosition: (cursorPosition) => set({ cursorPosition }),
  setSelectedDuration: (selectedDuration) => set({ selectedDuration }),
  setIsChromatic: (isChromatic) => set({ isChromatic }),
  setSelectedNoteId: (selectedNoteId) => set({ selectedNoteId }),
}));

function transposeNotes(notes: Note[], oldKey: string, newKey: string): Note[] {
  const keyMap: Record<string, number> = {
    'C Major': 0, 'G Major': 7, 'D Major': 2, 'A Major': 9, 'E Major': 4, 'B Major': 11,
    'F Major': 5, 'Bb Major': 10, 'Eb Major': 3, 'Ab Major': 8, 'Db Major': 1, 'Gb Major': 6,
  };

  const semitones = (keyMap[newKey] || 0) - (keyMap[oldKey] || 0);
  if (semitones === 0) return notes;

  return notes.map(note => ({
    ...note,
    pitch: transposePitch(note.pitch, semitones)
  }));
}

function transposePitch(pitch: string, semitones: number): string {
  const noteRegex = /^([A-G][#b]?)(\d+)$/;
  const match = pitch.match(noteRegex);
  if (!match) return pitch;

  const [, noteName, octave] = match;
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteIndex = notes.indexOf(noteName.replace('b', '#'));

  if (noteIndex === -1) return pitch;

  const totalSemitones = noteIndex + semitones;
  const newNoteIndex = ((totalSemitones % 12) + 12) % 12;
  const octaveChange = Math.floor(totalSemitones / 12);
  const newOctave = parseInt(octave) + octaveChange;

  return `${notes[newNoteIndex]}${newOctave}`;
}