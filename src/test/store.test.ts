import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

describe('Zustand Store', () => {
  beforeEach(() => {
    const state = useStore.getState();
    state.song.notes = [];
    state.song.tempo = 120;
    state.song.key = 'C Major';
    state.song.meter = { beatsPerMeasure: 4, beatUnit: 4 };
    state.isPlaying = false;
    state.currentBeat = 0;
    state.selectedDuration = 1;
    state.isChromatic = false;
    state.selectedNoteId = null;
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useStore.getState();
      expect(state.song.tempo).toBe(120);
      expect(state.song.key).toBe('C Major');
      expect(state.song.meter.beatsPerMeasure).toBe(4);
      expect(state.song.notes).toEqual([]);
      expect(state.isPlaying).toBe(false);
      expect(state.selectedDuration).toBe(1);
    });
  });

  describe('tempo management', () => {
    it('should update tempo', () => {
      const { setTempo } = useStore.getState();
      setTempo(140);
      expect(useStore.getState().song.tempo).toBe(140);
    });
  });

  describe('meter management', () => {
    it('should update beats per measure', () => {
      const { setMeter } = useStore.getState();
      setMeter(3);
      expect(useStore.getState().song.meter.beatsPerMeasure).toBe(3);
    });

    it('should preserve beat unit when changing beats per measure', () => {
      const { setMeter } = useStore.getState();
      setMeter(6);
      expect(useStore.getState().song.meter.beatUnit).toBe(4);
    });
  });

  describe('key management and transposition', () => {
    it('should update key', () => {
      const { setKey } = useStore.getState();
      setKey('G Major');
      expect(useStore.getState().song.key).toBe('G Major');
    });

    it('should transpose notes when changing key from C to G (7 semitones up)', () => {
      const { addNote, setKey } = useStore.getState();

      addNote({ pitch: 'C4', startTime: 0, duration: 1 });
      addNote({ pitch: 'E4', startTime: 1, duration: 1 });

      setKey('G Major');

      const notes = useStore.getState().song.notes;
      expect(notes[0].pitch).toBe('G4');
      expect(notes[1].pitch).toBe('B4');
    });

    it('should transpose notes chromatically including non-scale notes', () => {
      const { addNote, setKey } = useStore.getState();

      addNote({ pitch: 'C#4', startTime: 0, duration: 1 });

      setKey('D Major');

      const notes = useStore.getState().song.notes;
      expect(notes[0].pitch).toBe('D#4');
    });

    it('should handle octave changes during transposition', () => {
      const { addNote, setKey } = useStore.getState();

      addNote({ pitch: 'B4', startTime: 0, duration: 1 });

      setKey('D Major');

      const notes = useStore.getState().song.notes;
      expect(notes[0].pitch).toBe('C#5');
    });
  });

  describe('note management', () => {
    it('should add a note with generated ID', () => {
      const { addNote } = useStore.getState();
      addNote({ pitch: 'C4', startTime: 0, duration: 1 });

      const notes = useStore.getState().song.notes;
      expect(notes).toHaveLength(1);
      expect(notes[0]).toHaveProperty('id');
      expect(notes[0].pitch).toBe('C4');
    });

    it('should update a note by ID', () => {
      const { addNote, updateNote } = useStore.getState();
      addNote({ pitch: 'C4', startTime: 0, duration: 1 });

      const noteId = useStore.getState().song.notes[0].id;
      updateNote(noteId, { pitch: 'D4', duration: 2 });

      const note = useStore.getState().song.notes[0];
      expect(note.pitch).toBe('D4');
      expect(note.duration).toBe(2);
      expect(note.startTime).toBe(0);
    });

    it('should delete a note by ID', () => {
      const { addNote, deleteNote } = useStore.getState();
      addNote({ pitch: 'C4', startTime: 0, duration: 1 });
      addNote({ pitch: 'E4', startTime: 1, duration: 1 });

      const noteId = useStore.getState().song.notes[0].id;
      deleteNote(noteId);

      const notes = useStore.getState().song.notes;
      expect(notes).toHaveLength(1);
      expect(notes[0].pitch).toBe('E4');
    });

    it('should not affect other notes when updating one', () => {
      const { addNote, updateNote } = useStore.getState();
      addNote({ pitch: 'C4', startTime: 0, duration: 1 });
      addNote({ pitch: 'E4', startTime: 1, duration: 1 });

      const firstNoteId = useStore.getState().song.notes[0].id;
      updateNote(firstNoteId, { pitch: 'D4' });

      const notes = useStore.getState().song.notes;
      expect(notes[1].pitch).toBe('E4');
    });
  });

  describe('playback state', () => {
    it('should toggle playing state', () => {
      const { setIsPlaying } = useStore.getState();
      setIsPlaying(true);
      expect(useStore.getState().isPlaying).toBe(true);

      setIsPlaying(false);
      expect(useStore.getState().isPlaying).toBe(false);
    });

    it('should update current beat position', () => {
      const { setCurrentBeat } = useStore.getState();
      setCurrentBeat(4.5);
      expect(useStore.getState().currentBeat).toBe(4.5);
    });
  });

  describe('UI state', () => {
    it('should update selected duration', () => {
      const { setSelectedDuration } = useStore.getState();
      setSelectedDuration(0.5);
      expect(useStore.getState().selectedDuration).toBe(0.5);
    });

    it('should toggle chromatic mode', () => {
      const { setIsChromatic } = useStore.getState();
      setIsChromatic(true);
      expect(useStore.getState().isChromatic).toBe(true);
    });

    it('should select and deselect notes', () => {
      const { addNote, setSelectedNoteId } = useStore.getState();
      addNote({ pitch: 'C4', startTime: 0, duration: 1 });

      const noteId = useStore.getState().song.notes[0].id;
      setSelectedNoteId(noteId);
      expect(useStore.getState().selectedNoteId).toBe(noteId);

      setSelectedNoteId(null);
      expect(useStore.getState().selectedNoteId).toBeNull();
    });
  });
});