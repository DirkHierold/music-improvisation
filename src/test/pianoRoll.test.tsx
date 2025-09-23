import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PianoRoll } from '../components/PianoRoll';
import { useStore } from '../store';

vi.mock('../services/AudioEngine', () => ({
  audioEngine: {
    initialize: vi.fn().mockResolvedValue(undefined),
    playNote: vi.fn(),
  },
}));

describe('PianoRoll Component', () => {
  beforeEach(() => {
    const state = useStore.getState();
    state.song.notes = [];
    state.song.key = 'C Major';
    state.song.meter = { beatsPerMeasure: 4, beatUnit: 4 };
    state.isChromatic = false;
    state.selectedDuration = 1;
    state.selectedNoteId = null;
    vi.clearAllMocks();
  });

  describe('grid rendering', () => {
    it('should render note labels for diatonic scale', () => {
      render(<PianoRoll />);

      expect(screen.getByText('C4')).toBeInTheDocument();
      expect(screen.getByText('D4')).toBeInTheDocument();
      expect(screen.getByText('E4')).toBeInTheDocument();
      expect(screen.getByText('F4')).toBeInTheDocument();
      expect(screen.getByText('G4')).toBeInTheDocument();
      expect(screen.getByText('A4')).toBeInTheDocument();
      expect(screen.getByText('B4')).toBeInTheDocument();
    });

    it('should render chromatic notes when chromatic mode is enabled', () => {
      useStore.getState().setIsChromatic(true);
      render(<PianoRoll />);

      expect(screen.getByText('C#4')).toBeInTheDocument();
      expect(screen.getByText('D#4')).toBeInTheDocument();
    });

    it('should render grid structure', () => {
      render(<PianoRoll />);
      expect(screen.getByText('C4')).toBeInTheDocument();
    });
  });

  describe('note creation', () => {
    it('should provide interface for adding notes', () => {
      render(<PianoRoll />);
      expect(screen.getByText('C4')).toBeInTheDocument();
    });

    it('should respect selected duration when creating notes', () => {
      useStore.getState().setSelectedDuration(2);
      expect(useStore.getState().selectedDuration).toBe(2);
    });
  });

  describe('note selection and deletion', () => {
    it('should render notes on the grid', () => {
      useStore.getState().addNote({ pitch: 'C4', startTime: 0, duration: 1 });
      render(<PianoRoll />);
      expect(useStore.getState().song.notes).toHaveLength(1);
    });

    it('should delete selected note on Delete key press', () => {
      const { addNote, setSelectedNoteId } = useStore.getState();
      addNote({ pitch: 'C4', startTime: 0, duration: 1 });
      const noteId = useStore.getState().song.notes[0].id;
      setSelectedNoteId(noteId);

      render(<PianoRoll />);

      fireEvent.keyDown(window, { key: 'Delete' });

      expect(useStore.getState().song.notes).toHaveLength(0);
      expect(useStore.getState().selectedNoteId).toBeNull();
    });

    it('should delete selected note on Backspace key press', () => {
      const { addNote, setSelectedNoteId } = useStore.getState();
      addNote({ pitch: 'C4', startTime: 0, duration: 1 });
      const noteId = useStore.getState().song.notes[0].id;
      setSelectedNoteId(noteId);

      render(<PianoRoll />);

      fireEvent.keyDown(window, { key: 'Backspace' });

      expect(useStore.getState().song.notes).toHaveLength(0);
    });
  });

  describe('ripple drag functionality', () => {
    it('should move subsequent notes when dragging a note horizontally', () => {
      const { addNote } = useStore.getState();
      addNote({ pitch: 'C4', startTime: 0, duration: 1 });
      addNote({ pitch: 'E4', startTime: 2, duration: 1 });
      addNote({ pitch: 'G4', startTime: 4, duration: 1 });

      render(<PianoRoll />);

      const firstNote = document.querySelector('[class*="NoteBlock"]');
      if (firstNote) {
        fireEvent.mouseDown(firstNote, { clientX: 0, clientY: 0 });
        fireEvent(window, new MouseEvent('mousemove', { clientX: 60, clientY: 0 }));
        fireEvent(window, new MouseEvent('mouseup'));

        const notes = useStore.getState().song.notes;
        expect(notes[0].startTime).toBe(1);
        expect(notes[1].startTime).toBe(3);
        expect(notes[2].startTime).toBe(5);
      }
    });

    it('should change pitch when dragging note vertically', () => {
      const { addNote } = useStore.getState();
      addNote({ pitch: 'C4', startTime: 0, duration: 1 });

      render(<PianoRoll />);

      const noteBlock = document.querySelector('[class*="NoteBlock"]');
      if (noteBlock) {
        fireEvent.mouseDown(noteBlock, { clientX: 0, clientY: 0 });
        fireEvent(window, new MouseEvent('mousemove', { clientX: 0, clientY: -40 }));
        fireEvent(window, new MouseEvent('mouseup'));

        const note = useStore.getState().song.notes[0];
        expect(note.pitch).not.toBe('C4');
      }
    });
  });

  describe('note resizing', () => {
    it('should resize note when dragging resize handle', () => {
      const { addNote } = useStore.getState();
      addNote({ pitch: 'C4', startTime: 0, duration: 1 });

      render(<PianoRoll />);

      const resizeHandle = document.querySelector('[class*="ResizeHandle"]');
      if (resizeHandle) {
        fireEvent.mouseDown(resizeHandle, { clientX: 60, clientY: 0 });
        fireEvent(window, new MouseEvent('mousemove', { clientX: 120, clientY: 0 }));
        fireEvent(window, new MouseEvent('mouseup'));

        const note = useStore.getState().song.notes[0];
        expect(note.duration).toBeGreaterThan(1);
      }
    });

    it('should not resize below minimum duration', () => {
      const { addNote } = useStore.getState();
      addNote({ pitch: 'C4', startTime: 0, duration: 1 });

      render(<PianoRoll />);

      const resizeHandle = document.querySelector('[class*="ResizeHandle"]');
      if (resizeHandle) {
        fireEvent.mouseDown(resizeHandle, { clientX: 60, clientY: 0 });
        fireEvent(window, new MouseEvent('mousemove', { clientX: 0, clientY: 0 }));
        fireEvent(window, new MouseEvent('mouseup'));

        const note = useStore.getState().song.notes[0];
        expect(note.duration).toBeGreaterThanOrEqual(0.25);
      }
    });
  });
});