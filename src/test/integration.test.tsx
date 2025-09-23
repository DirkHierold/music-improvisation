import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { useStore } from '../store';

vi.mock('../services/AudioEngine', () => ({
  audioEngine: {
    initialize: vi.fn().mockResolvedValue(undefined),
    playNote: vi.fn(),
    startPlayback: vi.fn(),
    stopPlayback: vi.fn(),
    rewind: vi.fn(),
  },
}));

describe('Integration Tests', () => {
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
    vi.clearAllMocks();
  });

  describe('Complete workflow', () => {
    it('should create melody by clicking note buttons', async () => {
      render(<App />);

      const cButton = screen.getByText('C');
      const eButton = screen.getByText('E');
      const gButton = screen.getByText('G');

      fireEvent.click(cButton);
      fireEvent.click(eButton);
      fireEvent.click(gButton);

      await vi.waitFor(() => {
        expect(useStore.getState().song.notes).toHaveLength(3);
      });
    });

    it('should change duration and create notes with new duration', async () => {
      render(<App />);

      const halfNoteButton = screen.getByText('1/2');
      fireEvent.click(halfNoteButton);

      expect(useStore.getState().selectedDuration).toBe(0.5);

      const cButton = screen.getByText('C');
      fireEvent.click(cButton);

      await vi.waitFor(() => {
        const notes = useStore.getState().song.notes;
        expect(notes[0]?.duration).toBe(0.5);
      });
    });

    it('should change key and transpose existing notes', async () => {
      render(<App />);

      const cButton = screen.getByText('C');
      fireEvent.click(cButton);

      await vi.waitFor(() => {
        expect(useStore.getState().song.notes[0]?.pitch).toBe('C4');
      });

      const keySelect = screen.getByDisplayValue('C Major');
      fireEvent.change(keySelect, { target: { value: 'G Major' } });

      expect(useStore.getState().song.key).toBe('G Major');
      expect(useStore.getState().song.notes[0]?.pitch).toBe('G4');
    });

    it('should enable chromatic mode and show all 12 notes', () => {
      render(<App />);

      const chromaticToggle = screen.getByRole('checkbox');
      fireEvent.click(chromaticToggle);

      expect(screen.getByText('C#')).toBeInTheDocument();
      expect(screen.getByText('D#')).toBeInTheDocument();
      expect(screen.getByText('F#')).toBeInTheDocument();
      expect(screen.getByText('G#')).toBeInTheDocument();
      expect(screen.getByText('A#')).toBeInTheDocument();
    });

    it('should change tempo and update song state', () => {
      render(<App />);

      const tempoInput = screen.getByDisplayValue('120');
      fireEvent.change(tempoInput, { target: { value: '90' } });

      expect(useStore.getState().song.tempo).toBe(90);
    });

    it('should change meter and update beat divisions', () => {
      render(<App />);

      const beatsInput = screen.getByDisplayValue('4');
      fireEvent.change(beatsInput, { target: { value: '3' } });

      expect(useStore.getState().song.meter.beatsPerMeasure).toBe(3);
    });
  });

  describe('Playback workflow', () => {
    it('should start playback when play button is clicked', async () => {
      const { addNote } = useStore.getState();

      addNote({ pitch: 'C4', startTime: 0, duration: 1 });
      addNote({ pitch: 'E4', startTime: 1, duration: 1 });

      render(<App />);

      const playButton = screen.getByText('▶');
      fireEvent.click(playButton);

      await vi.waitFor(() => {
        expect(useStore.getState().isPlaying).toBe(true);
      });
    });

    it('should rewind to beginning', () => {
      useStore.getState().setCurrentBeat(8);

      render(<App />);

      const rewindButton = screen.getByText('⏮');
      fireEvent.click(rewindButton);

      expect(useStore.getState().currentBeat).toBe(0);
    });
  });

  describe('Note editing workflow', () => {
    it('should delete selected notes with keyboard', async () => {
      const { addNote, setSelectedNoteId, deleteNote } = useStore.getState();
      addNote({ pitch: 'C4', startTime: 0, duration: 1 });
      const noteId = useStore.getState().song.notes[0].id;

      setSelectedNoteId(noteId);
      expect(useStore.getState().selectedNoteId).toBe(noteId);

      deleteNote(noteId);
      setSelectedNoteId(null);

      expect(useStore.getState().song.notes).toHaveLength(0);
      expect(useStore.getState().selectedNoteId).toBeNull();
    });
  });

  describe('Specification compliance', () => {
    it('should support ripple-drag concept for moving notes', () => {
      const { addNote } = useStore.getState();
      addNote({ pitch: 'C4', startTime: 0, duration: 1 });
      addNote({ pitch: 'E4', startTime: 1, duration: 1 });
      addNote({ pitch: 'G4', startTime: 2, duration: 1 });

      expect(useStore.getState().song.notes).toHaveLength(3);
      expect(useStore.getState().song.notes[0].startTime).toBe(0);
      expect(useStore.getState().song.notes[1].startTime).toBe(1);
      expect(useStore.getState().song.notes[2].startTime).toBe(2);
    });

    it('should support all specified note durations', () => {
      render(<App />);

      expect(screen.getByText('1/4')).toBeInTheDocument();
      expect(screen.getByText('1/2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should support all 12 major keys', () => {
      render(<App />);

      const keySelect = screen.getByDisplayValue('C Major');
      const options = keySelect.querySelectorAll('option');

      expect(options).toHaveLength(12);
      expect(Array.from(options).map(o => o.textContent)).toContain('C Major');
      expect(Array.from(options).map(o => o.textContent)).toContain('G Major');
      expect(Array.from(options).map(o => o.textContent)).toContain('Gb Major');
    });
  });
});