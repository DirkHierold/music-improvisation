import { create } from 'zustand';
import { Song, Note, NoteDuration } from '../types';
import { saveMusicXMLFile, loadMusicXMLFile } from '../utils/musicxml';

interface AppState {
  song: Song;
  isPlaying: boolean;
  currentBeat: number;
  cursorPosition: number;
  selectedDuration: NoteDuration;
  isChromatic: boolean;
  selectedNoteId: string | null;
  isPracticeMode: boolean;
  history: {
    past: Song[];
    future: Song[];
  };

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
  setIsPracticeMode: (isPracticeMode: boolean) => void;
  saveSong: (filename: string) => Promise<void>;
  loadSong: (file: File) => Promise<boolean>;
  setSong: (song: Song) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const MAX_HISTORY = 50;

function pushHistory(state: AppState): Partial<AppState> {
  return {
    history: {
      past: [...state.history.past, state.song].slice(-MAX_HISTORY),
      future: [],
    },
  };
}

export const useStore = create<AppState>((set, get) => ({
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
  isPracticeMode: false,
  history: {
    past: [],
    future: [],
  },

  setTempo: (tempo) => set((state) => ({
    ...pushHistory(state),
    song: { ...state.song, tempo }
  })),

  setMeter: (beatsPerMeasure) => set((state) => ({
    ...pushHistory(state),
    song: {
      ...state.song,
      meter: { ...state.song.meter, beatsPerMeasure }
    }
  })),

  setKey: (key) => set((state) => {
    const oldKey = state.song.key;
    const transposedNotes = transposeNotes(state.song.notes, oldKey, key);
    return {
      ...pushHistory(state),
      song: { ...state.song, key, notes: transposedNotes }
    };
  }),

  addNote: (noteData) => set((state) => {
    const newId = crypto.randomUUID();
    return {
      ...pushHistory(state),
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
    ...pushHistory(state),
    song: {
      ...state.song,
      notes: state.song.notes.map((note) =>
        note.id === id ? { ...note, ...updates } : note
      )
    }
  })),

  deleteNote: (id) => set((state) => {
    const noteToDelete = state.song.notes.find(n => n.id === id);
    const remainingNotes = state.song.notes.filter((note) => note.id !== id);

    let newCursorPosition = 0;
    let newSelectedNoteId = null;

    if (noteToDelete && remainingNotes.length > 0) {
      const notesBefore = remainingNotes
        .filter(n => n.startTime < noteToDelete.startTime)
        .sort((a, b) => b.startTime - a.startTime);

      if (notesBefore.length > 0) {
        const previousNote = notesBefore[0];
        newCursorPosition = previousNote.startTime + previousNote.duration;
        newSelectedNoteId = previousNote.id;
      }
    }

    return {
      ...pushHistory(state),
      song: {
        ...state.song,
        notes: remainingNotes
      },
      cursorPosition: newCursorPosition,
      selectedNoteId: newSelectedNoteId,
      selectedDuration: newSelectedNoteId
        ? (remainingNotes.find(n => n.id === newSelectedNoteId)?.duration as NoteDuration || state.selectedDuration)
        : state.selectedDuration
    };
  }),

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentBeat: (currentBeat) => {
    set({ currentBeat });
  },
  setCursorPosition: (cursorPosition) => set({ cursorPosition }),
  setSelectedDuration: (selectedDuration) => set({ selectedDuration }),
  setIsChromatic: (isChromatic) => set({ isChromatic }),
  setSelectedNoteId: (selectedNoteId) => set({ selectedNoteId }),
  setIsPracticeMode: (isPracticeMode) => set({ isPracticeMode }),

  saveSong: async (filename: string) => {
    const state = useStore.getState();
    await saveMusicXMLFile(state.song, filename);
  },

  loadSong: async (file: File) => {
    try {
      const song = await loadMusicXMLFile(file);
      set({
        song,
        cursorPosition: 0,
        selectedNoteId: null,
        isPlaying: false,
        currentBeat: 0
      });
      return true;
    } catch (error) {
      console.error('Failed to load MusicXML file:', error);
      return false;
    }
  },

  setSong: (song) => set((state) => ({
    ...pushHistory(state),
    song,
    cursorPosition: 0,
    selectedNoteId: null,
    isPlaying: false,
    currentBeat: 0
  })),

  undo: () => set((state) => {
    if (state.history.past.length === 0) return state;

    const previous = state.history.past[state.history.past.length - 1];
    const newPast = state.history.past.slice(0, -1);

    return {
      song: previous,
      history: {
        past: newPast,
        future: [state.song, ...state.history.future],
      },
    };
  }),

  redo: () => set((state) => {
    if (state.history.future.length === 0) return state;

    const next = state.history.future[0];
    const newFuture = state.history.future.slice(1);

    return {
      song: next,
      history: {
        past: [...state.history.past, state.song],
        future: newFuture,
      },
    };
  }),

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,
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