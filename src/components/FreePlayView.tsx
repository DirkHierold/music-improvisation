import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useStore } from '../store';
import { MAJOR_SCALES, NOTE_COLORS, CHROMATIC_NOTES } from '../types';
import { audioEngine } from '../services/AudioEngine';

const Container = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 5px;
  background-color: #2a2a2a;
  border-radius: 5px;
`;

const GridContainer = styled.div`
  flex: 1;
  display: grid;
  gap: 3px;
  padding: 0;
  overflow: hidden;
  justify-content: stretch;
  align-content: stretch;

  /* Make grid items responsive to container size */
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(8, 1fr);

  /* Start grid from bottom-left corner */
  grid-auto-flow: column;

  /* Flip grid vertically so first items appear at bottom */
  transform: scaleY(-1);

  /* Flip individual buttons back */
  & > button {
    transform: scaleY(-1);
  }
`;

interface NoteButtonProps {
  $color: string;
  $isInScale: boolean;
  $isActive: boolean;
}

const NoteButton = styled.button<NoteButtonProps>`
  background-color: ${props => props.$isInScale
    ? props.$color + '80' /* Add transparency for pastel effect */
    : '#3c3c3c'};
  border: 2px solid ${props => props.$isInScale
    ? props.$color
    : '#555'};
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  transition: transform 0.05s ease-out, opacity 0.1s;
  touch-action: none;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  opacity: ${props => props.$isInScale ? 1 : 0.5};
  transform: ${props => props.$isActive ? 'scale(1.15, -1.15)' : 'scale(1, -1)'};
  transform-origin: center center;

  &:hover {
    opacity: 1;
  }
`;

// Generate chromatic scale with note names and MIDI numbers
function generateNoteGrid(rows: number = 8, cols: number = 12) {
  const grid: Array<{ note: string; octave: number; pitch: string }> = [];

  // Start from C3 (MIDI 48)
  const startMidi = 48;

  // Generate grid column by column (left to right)
  // Within each column, go from bottom to top (row 0 = bottom)
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      // Isomorphic layout:
      // - Each column = whole tone (2 semitones right)
      // - Each row = semitone up (1 semitone up)
      const midiNote = startMidi + (col * 2) + row;
      const noteIndex = midiNote % 12;
      const octave = Math.floor(midiNote / 12) - 1;
      const note = CHROMATIC_NOTES[noteIndex];

      grid.push({
        note,
        octave,
        pitch: `${note}${octave}`
      });
    }
  }

  return grid;
}

export function FreePlayView() {
  const { song } = useStore();
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleNotes = MAJOR_SCALES[song.key] || MAJOR_SCALES['C Major'];

  const noteGrid = generateNoteGrid(8, 12);

  // Initialize audio engine
  useEffect(() => {
    audioEngine.initialize();
  }, []);

  const isNoteInScale = (note: string): boolean => {
    // Normalize notes for comparison (convert sharps to flats or vice versa)
    const normalizeNote = (n: string): string => {
      // Map of enharmonic equivalents
      const enharmonicMap: Record<string, string> = {
        'C#': 'Db', 'Db': 'C#',
        'D#': 'Eb', 'Eb': 'D#',
        'F#': 'Gb', 'Gb': 'F#',
        'G#': 'Ab', 'Ab': 'G#',
        'A#': 'Bb', 'Bb': 'A#',
      };
      return enharmonicMap[n] || n;
    };

    return scaleNotes.some(scaleNote => {
      return scaleNote === note || normalizeNote(scaleNote) === note;
    });
  };

  const getNoteColor = (note: string): string => {
    const noteBase = note.replace('#', '').replace('b', '');
    const color = NOTE_COLORS[noteBase];

    if (!color) return '#888';

    // Return pastel version of the color
    return color;
  };

  const handleNoteStart = (pitch: string) => {
    if (!activeNotes.has(pitch)) {
      setActiveNotes(prev => new Set(prev).add(pitch));
      audioEngine.playNote(pitch, 2); // Play for 2 seconds
    }
  };

  const handleNoteEnd = (pitch: string) => {
    // Only update state, don't play sound
    setActiveNotes(prev => {
      const newSet = new Set(prev);
      newSet.delete(pitch);
      return newSet;
    });
  };

  // Mouse events
  const handleMouseDown = (pitch: string) => {
    handleNoteStart(pitch);
  };

  const handleMouseUp = (pitch: string) => {
    handleNoteEnd(pitch);
  };

  // Touch events - simple touch without sliding
  const handleTouchStart = (e: React.TouchEvent, pitch: string) => {
    e.preventDefault();
    handleNoteStart(pitch);
  };

  const handleTouchEnd = (e: React.TouchEvent, pitch: string) => {
    e.preventDefault();
    handleNoteEnd(pitch);
  };

  return (
    <Container ref={containerRef}>
      <GridContainer>
        {noteGrid.map((noteData, index) => {
          const inScale = isNoteInScale(noteData.note);
          const color = getNoteColor(noteData.note);
          const isActive = activeNotes.has(noteData.pitch);

          return (
            <NoteButton
              key={index}
              data-pitch={noteData.pitch}
              $color={color}
              $isInScale={inScale}
              $isActive={isActive}
              onMouseDown={() => handleMouseDown(noteData.pitch)}
              onMouseUp={() => handleMouseUp(noteData.pitch)}
              onMouseLeave={() => handleMouseUp(noteData.pitch)}
              onTouchStart={(e) => handleTouchStart(e, noteData.pitch)}
              onTouchEnd={(e) => handleTouchEnd(e, noteData.pitch)}
              onTouchCancel={(e) => handleTouchEnd(e, noteData.pitch)}
            >
              {noteData.note}
            </NoteButton>
          );
        })}
      </GridContainer>
    </Container>
  );
}
