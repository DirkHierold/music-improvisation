import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransportControls } from '../components/TransportControls';
import { MusicalParameters } from '../components/MusicalParameters';
import { DurationPanel } from '../components/DurationPanel';
import { NoteButtons } from '../components/NoteButtons';
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

describe('UI Components', () => {
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

  describe('TransportControls', () => {
    it('should render play and rewind buttons', () => {
      render(<TransportControls />);
      expect(screen.getByText('▶')).toBeInTheDocument();
      expect(screen.getByText('⏮')).toBeInTheDocument();
    });

    it('should change play button to stop when playing', async () => {
      render(<TransportControls />);
      const playButton = screen.getByText('▶');

      fireEvent.click(playButton);

      await vi.waitFor(() => {
        expect(useStore.getState().isPlaying).toBe(true);
      });
    });

    it('should reset position on rewind button click', () => {
      render(<TransportControls />);

      const rewindButton = screen.getByText('⏮');
      fireEvent.click(rewindButton);

      expect(useStore.getState().currentBeat).toBe(0);
    });
  });

  describe('MusicalParameters', () => {
    it('should render tempo, key, and beats controls', () => {
      render(<MusicalParameters />);

      expect(screen.getByDisplayValue('120')).toBeInTheDocument();
      expect(screen.getByDisplayValue('4')).toBeInTheDocument();
      expect(screen.getByDisplayValue('C Major')).toBeInTheDocument();
    });

    it('should update tempo when input changes', () => {
      render(<MusicalParameters />);

      const tempoInput = screen.getByDisplayValue('120');
      fireEvent.change(tempoInput, { target: { value: '140' } });

      expect(useStore.getState().song.tempo).toBe(140);
    });

    it('should update key when select changes', () => {
      render(<MusicalParameters />);

      const keySelect = screen.getByDisplayValue('C Major');
      fireEvent.change(keySelect, { target: { value: 'G Major' } });

      expect(useStore.getState().song.key).toBe('G Major');
    });

    it('should update beats per measure', () => {
      render(<MusicalParameters />);

      const beatsInput = screen.getByDisplayValue('4');
      fireEvent.change(beatsInput, { target: { value: '3' } });

      expect(useStore.getState().song.meter.beatsPerMeasure).toBe(3);
    });
  });

  describe('DurationPanel', () => {
    it('should render all duration options', () => {
      render(<DurationPanel />);

      expect(screen.getByText('1/4')).toBeInTheDocument();
      expect(screen.getByText('1/2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should highlight selected duration', () => {
      useStore.getState().setSelectedDuration(0.5);
      render(<DurationPanel />);

      const halfNoteButton = screen.getByText('1/2');
      expect(halfNoteButton).toHaveStyle({ backgroundColor: '#5dade2' });
    });

    it('should update selected duration on click', () => {
      render(<DurationPanel />);

      const quarterNoteButton = screen.getByText('1/4');
      fireEvent.click(quarterNoteButton);

      expect(useStore.getState().selectedDuration).toBe(0.25);
    });
  });

  describe('NoteButtons', () => {
    it('should render note buttons for current key', () => {
      render(<NoteButtons />);

      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
      expect(screen.getByText('E')).toBeInTheDocument();
      expect(screen.getByText('F')).toBeInTheDocument();
      expect(screen.getByText('G')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('should show chromatic notes when chromatic mode is enabled', () => {
      useStore.getState().setIsChromatic(true);
      render(<NoteButtons />);

      expect(screen.getByText('C#')).toBeInTheDocument();
      expect(screen.getByText('D#')).toBeInTheDocument();
      expect(screen.getByText('F#')).toBeInTheDocument();
    });

    it('should toggle chromatic mode', () => {
      render(<NoteButtons />);

      const chromaticToggle = screen.getByRole('checkbox');
      fireEvent.click(chromaticToggle);

      expect(useStore.getState().isChromatic).toBe(true);
    });

    it('should add note when note button is clicked', async () => {
      render(<NoteButtons />);

      const cButton = screen.getByText('C');
      fireEvent.click(cButton);

      await vi.waitFor(() => {
        expect(useStore.getState().song.notes).toHaveLength(1);
        expect(useStore.getState().song.notes[0].pitch).toBe('C4');
      });
    });

    it('should update notes display when key changes', () => {
      const { rerender } = render(<NoteButtons />);

      useStore.getState().setKey('G Major');
      rerender(<NoteButtons />);

      expect(screen.getByText('F#')).toBeInTheDocument();
    });
  });
});