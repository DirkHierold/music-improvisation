import { useState, useRef, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useStore } from '../store';
import { MAJOR_SCALES, CHROMATIC_NOTES, NOTE_COLORS, NoteDuration, getChordInfo, getChordNotes, durationToComponents, Note, Chord } from '../types';
import { audioEngine } from '../services/AudioEngine';
import { NoteRondel, NoteOption } from './NoteRondel';

const Container = styled.div`
  flex: 1;
  overflow: auto;
  background-color: #2c2c2c;
  border-radius: 5px;
  position: relative;
`;

const Grid = styled.div`
  position: relative;
  min-height: 400px;
  margin-bottom: 20px;
`;

const Row = styled.div`
  display: flex;
  height: 40px;
  position: relative;
`;

const NoteLabel = styled.div`
  width: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #333;
  border-right: 1px solid #3c3c3c;
  border-bottom: 1px solid #3c3c3c;
  font-size: 12px;
  color: #888;
`;

const Timeline = styled.div`
  position: relative;
  display: flex;
  border-bottom: 1px solid #3c3c3c;
`;

const Beat = styled.div<{ $isMeasureStart: boolean; $chordSegments?: Array<{ color: string; startOffset: number; coverage: number }> }>`
  width: 60px;
  border-left: 1px solid ${props => props.$isMeasureStart ? '#555' : 'transparent'};
  border-right: 1px solid #3a3a3a;
  flex-shrink: 0;
  position: relative;
  background: ${props => {
    if (!props.$chordSegments || props.$chordSegments.length === 0) return 'transparent';

    // Build a gradient that shows all chord segments
    const gradientParts: string[] = [];
    let currentPos = 0;

    // Sort segments by start offset
    const sortedSegments = [...props.$chordSegments].sort((a, b) => a.startOffset - b.startOffset);

    for (const segment of sortedSegments) {
      const startPercent = segment.startOffset * 100;
      const endPercent = (segment.startOffset + segment.coverage) * 100;

      // Add transparent section before this segment if needed
      if (currentPos < startPercent) {
        gradientParts.push(`transparent ${currentPos}%`);
        gradientParts.push(`transparent ${startPercent}%`);
      }

      // Add the colored segment
      gradientParts.push(`${segment.color} ${startPercent}%`);
      gradientParts.push(`${segment.color} ${endPercent}%`);

      currentPos = endPercent;
    }

    // Add transparent section at the end if needed
    if (currentPos < 100) {
      gradientParts.push(`transparent ${currentPos}%`);
    }

    return `linear-gradient(to right, ${gradientParts.join(', ')})`;
  }};
`;

const BeatClickArea = styled.div`
  position: absolute;
  left: -3px;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: pointer;
  z-index: 5;

  &:hover {
    background-color: rgba(230, 126, 34, 0.3);
  }
`;

const EndBar = styled.div`
  width: 1px;
  border-left: 1px solid #555;
  flex-shrink: 0;
`;

const NoteBlock = styled.div<{ $color: string; $selected: boolean; $isPlaying: boolean }>`
  position: absolute;
  height: 30px;
  top: 5px;
  background-color: ${props => props.$color};
  border: 2px solid ${props => props.$selected ? '#fff' : 'transparent'};
  border-radius: 3px;
  cursor: move;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
  user-select: none;
  box-sizing: border-box;
  opacity: ${props => props.$isPlaying ? 1 : 0.8};
  box-shadow: ${props => props.$isPlaying ? '0 0 10px rgba(255, 255, 255, 0.8)' : 'none'};
  transform: ${props => props.$isPlaying ? 'scale(1.05)' : 'scale(1)'};
  transition: opacity 0.1s, box-shadow 0.1s, transform 0.1s;

  &:hover {
    opacity: 0.9;
  }
`;

const ResizeHandle = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  background-color: rgba(255, 255, 255, 0.3);

  &:hover {
    background-color: rgba(255, 255, 255, 0.5);
  }
`;

const PlaybackCursor = styled.div.attrs<{ $position: number }>(props => ({
  style: {
    left: `${props.$position}px`
  }
}))<{ $position: number }>`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #e67e22;
  pointer-events: none;
  z-index: 10;
`;

const ChordRow = styled.div`
  display: flex;
  height: 50px;
  position: relative;
  border-top: 2px solid #555;
`;

const ChordLabel = styled.div`
  width: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #333;
  border-right: 1px solid #3c3c3c;
  border-bottom: 1px solid #3c3c3c;
  font-size: 12px;
  color: #888;
  font-weight: bold;
`;

const ChordTimeline = styled.div`
  position: relative;
  display: flex;
  border-bottom: 1px solid #3c3c3c;
`;

const ChordBlock = styled.div<{ $selected: boolean; $isPlaying: boolean; $color: string }>`
  position: absolute;
  height: 40px;
  top: 5px;
  background-color: ${props => props.$color};
  border: 2px solid ${props => props.$selected ? '#fff' : 'transparent'};
  border-radius: 3px;
  cursor: move;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  font-weight: bold;
  user-select: none;
  box-sizing: border-box;
  opacity: ${props => props.$isPlaying ? 1 : 0.8};
  box-shadow: ${props => props.$isPlaying ? '0 0 10px rgba(255, 255, 255, 0.8)' : 'none'};
  transform: ${props => props.$isPlaying ? 'scale(1.05)' : 'scale(1)'};
  transition: opacity 0.1s, box-shadow 0.1s, transform 0.1s;

  &:hover {
    opacity: 0.9;
  }
`;

const ChordRomanLabel = styled.div`
  font-size: 12px;
`;

const ChordNameLabel = styled.div`
  font-size: 9px;
  opacity: 0.8;
`;

const TablatureRow = styled.div`
  display: flex;
  height: 280px;
  position: relative;
  border-top: 2px solid #555;
`;

const TablatureLabel = styled.div`
  width: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #333;
  border-right: 1px solid #3c3c3c;
  border-bottom: 1px solid #3c3c3c;
  font-size: 12px;
  color: #888;
  font-weight: bold;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
`;

const TablatureTimeline = styled.div`
  position: relative;
  display: flex;
  border-bottom: 1px solid #3c3c3c;
  background-color: #3a2a1a;
`;

const TablatureString = styled.div<{ $stringIndex: number }>`
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #C0C0C0;
  top: ${props => 50 + props.$stringIndex * 60}px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  z-index: 1;
`;


const TablatureFretMarker = styled.div<{ $color: string; $selected: boolean }>`
  position: absolute;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: ${props => props.$color};
  border: 2px solid ${props => props.$selected ? '#fff' : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 11px;
  box-sizing: border-box;
  z-index: 10;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;

const EmptyNotePlaceholder = styled.div`
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: transparent;
  border: 1px dashed rgba(200, 200, 200, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(200, 200, 200, 0.4);
  font-weight: normal;
  font-size: 10px;
  box-sizing: border-box;
  z-index: 9;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(200, 200, 200, 0.6);
    background-color: rgba(200, 200, 200, 0.1);
    transform: scale(1.2);
  }
`;

// Ukulele tuning (standard GCEA)
const UKULELE_TUNING = ['A4', 'E4', 'C4', 'G4'];
const STRING_POSITIONS = [50, 110, 170, 230];

// Standard ukulele chord shapes for each Roman numeral in C Major
// Array index: [0: A-string, 1: E-string, 2: C-string, 3: G-string]
const UKULELE_CHORD_SHAPES: Record<string, Record<'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII', number[]>> = {
  'C Major': {
    'I': [3, 0, 0, 0],    // C major: A3-C4-E4-G4
    'II': [0, 2, 0, 0],   // D minor: A4-D4-F4-A4
    'III': [4, 4, 3, 2],  // E minor: E4-E4-G4-B4
    'IV': [0, 1, 0, 2],   // F major: A4-F4-C4-A4
    'V': [2, 3, 2, 0],    // G major: B4-G4-D4-G4
    'VI': [0, 0, 0, 0],   // A minor: A4-E4-C4-G4
    'VII': [1, 2, 1, 2],  // B diminished: Bb4-F#4-D4-A4
  },
  'G Major': {
    'I': [2, 3, 2, 0],    // G major
    'II': [0, 2, 3, 1],   // A minor
    'III': [4, 4, 3, 2],  // B minor
    'IV': [0, 0, 0, 0],   // C major
    'V': [0, 2, 3, 2],    // D major
    'VI': [4, 0, 0, 0],   // E minor
    'VII': [2, 3, 2, 3],  // F# diminished
  },
  'F Major': {
    'I': [0, 1, 0, 2],    // F major
    'II': [2, 0, 1, 0],   // G minor
    'III': [0, 0, 0, 0],  // A minor
    'IV': [1, 1, 0, 3],   // Bb major
    'V': [3, 0, 0, 0],    // C major
    'VI': [0, 2, 0, 0],   // D minor
    'VII': [3, 4, 3, 5],  // E diminished
  },
};

function getUkuleleChordShape(roman: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII', key: string): number[] {
  // Return the chord shape for the given key, or fall back to C Major
  const keyShapes = UKULELE_CHORD_SHAPES[key] || UKULELE_CHORD_SHAPES['C Major'];
  return keyShapes[roman] || [0, 0, 0, 0];
}

function getNoteFromFret(string: number, fret: number): string {
  const stringNote = UKULELE_TUNING[string];
  const baseNote = stringNote.slice(0, -1);
  const octave = parseInt(stringNote.slice(-1));

  const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const baseIndex = chromatic.indexOf(baseNote);
  const newIndex = (baseIndex + fret) % 12;
  const newOctave = octave + Math.floor((baseIndex + fret) / 12);

  return `${chromatic[newIndex]}${newOctave}`;
}

function findBestFretPosition(targetPitch: string): { string: number; fret: number } | null {
  const targetNote = targetPitch.slice(0, -1);

  let bestPosition = null;
  let bestFret = 999;

  // Only search within the 12-fret limit
  for (let string = 0; string < UKULELE_TUNING.length; string++) {
    for (let fret = 0; fret <= 12; fret++) {
      const fretNote = getNoteFromFret(string, fret);
      if (fretNote === targetPitch) {
        if (fret < bestFret) {
          bestPosition = { string, fret };
          bestFret = fret;
        }
      }
    }
  }

  if (!bestPosition && targetNote === 'C') {
    bestPosition = { string: 2, fret: 0 };
  }

  return bestPosition;
}

// Find fret position for a specific pitch on a specific string
function findFretPositionOnString(targetPitch: string, stringIndex: number): { string: number; fret: number } | null {
  for (let fret = 0; fret <= 12; fret++) {
    const fretNote = getNoteFromFret(stringIndex, fret);
    if (fretNote === targetPitch) {
      return { string: stringIndex, fret };
    }
  }
  return null;
}

// Get all unique pitches (melody + chord notes) at a given time
function getAllPitchesAtTime(timePosition: number, notes: Note[], chords: Chord[], key: string): string[] {
  const pitches = new Set<string>();

  // Add melody notes at this time
  notes.forEach(note => {
    if (note.startTime <= timePosition && note.startTime + note.duration > timePosition) {
      pitches.add(note.pitch);
    }
  });

  // Add chord notes at this time
  chords.forEach(chord => {
    if (chord.startTime <= timePosition && chord.startTime + chord.duration > timePosition) {
      const chordNotes = getChordNotes(chord.roman, key);
      // We need to find the actual pitches used in the ukulele rendering
      // For simplicity, we'll check octaves 3-5 for each chord note
      chordNotes.forEach(noteName => {
        for (let octave = 3; octave <= 5; octave++) {
          const pitch = `${noteName}${octave}`;
          // Check if this pitch is playable on ukulele
          if (findBestFretPosition(pitch)) {
            pitches.add(pitch);
          }
        }
      });
    }
  });

  return Array.from(pitches);
}

// Get the highest playable pitch on ukulele (A-string, 12th fret)
function getMaxUkulelePitch(): string {
  return getNoteFromFret(0, 12); // A-string (index 0), fret 12 = B5
}

// Get the lowest playable pitch on ukulele (C-string, open)
function getMinUkulelePitch(): string {
  return 'C4'; // C-string (index 2), fret 0
}

// Export function to calculate all ukulele notes for playback
export function calculateUkuleleNotes(notes: Note[], chords: Chord[], key: string): Array<{ pitch: string; startTime: number; duration: number; stringIndex?: number }> {
  const ukuleleNotes: Array<{ pitch: string; startTime: number; duration: number; stringIndex?: number }> = [];
  const processedTimes = new Set<string>();

  const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const getOrder = (pitch: string) => {
    const noteName = pitch.replace(/\d+/, '').replace(/b/g, '#');
    const octave = parseInt(pitch.match(/\d+/)?.[0] || '4');
    const noteIndex = chromatic.indexOf(noteName);
    return octave * 12 + noteIndex;
  };

  // Helper function to check if chord positions are strummable (no gaps)
  const isStrummable = (positions: Array<{ string: number; fret: number; note: string; pitch: string }>): boolean => {
    if (positions.length === 0) return false;
    if (positions.length === 1) return true;
    const sortedStrings = positions.map(p => p.string).sort((a, b) => a - b);
    for (let i = 0; i < sortedStrings.length - 1; i++) {
      if (sortedStrings[i + 1] - sortedStrings[i] > 1) {
        return false;
      }
    }
    return true;
  };

  // Process each chord
  chords.forEach(chord => {
    const chordNotes = getChordNotes(chord.roman, key);
    const chordStart = chord.startTime;
    const chordEnd = chord.startTime + chord.duration;

    // Find overlapping melody notes
    const overlappingNotes = notes.filter(
      n => n.startTime < chordEnd && n.startTime + n.duration > chordStart
    );

    let maxMelodyNoteOrder = -1;
    const melodyNotePitches = new Set<string>();
    if (overlappingNotes.length > 0) {
      maxMelodyNoteOrder = Math.max(...overlappingNotes.map(n => getOrder(n.pitch)));
      overlappingNotes.forEach(n => melodyNotePitches.add(n.pitch));
    }

    let chordPositions: Array<{ string: number; fret: number; note: string; pitch: string }> = [];

    // If no melody notes overlap, use standard chord shape
    if (overlappingNotes.length === 0) {
      const chordShape = getUkuleleChordShape(chord.roman, key);
      chordShape.forEach((fret, stringIndex) => {
        const pitch = getNoteFromFret(stringIndex, fret);
        const noteName = pitch.replace(/\d+/, '').replace(/b/g, '#');
        chordPositions.push({ string: stringIndex, fret, note: noteName, pitch });
      });
    } else {
      // With melody notes, fill strings with chord notes
      for (let stringIndex = 0; stringIndex < UKULELE_TUNING.length; stringIndex++) {
        let bestPosition = null;
        let lowestFret = 999;

        for (const chordNote of chordNotes) {
          for (let octave = 2; octave <= 5; octave++) {
            const pitch = `${chordNote}${octave}`;
            const noteOrder = getOrder(pitch);

            if (melodyNotePitches.has(pitch)) continue;

            if (noteOrder < maxMelodyNoteOrder) {
              const position = findFretPositionOnString(pitch, stringIndex);
              if (position && position.fret < lowestFret) {
                bestPosition = { ...position, note: chordNote, pitch };
                lowestFret = position.fret;
              }
            }
          }
        }

        if (bestPosition) {
          chordPositions.push(bestPosition);
        }
      }

      // Fill gaps if not strummable
      if (!isStrummable(chordPositions)) {
        chordPositions.sort((a, b) => a.string - b.string);
        const usedStrings = new Set(chordPositions.map(p => p.string));
        const minString = Math.min(...chordPositions.map(p => p.string));
        const maxString = Math.max(...chordPositions.map(p => p.string));

        for (let stringIndex = minString; stringIndex <= maxString; stringIndex++) {
          if (usedStrings.has(stringIndex)) continue;

          let bestPositionBelowMelody = null;
          let foundPosition = null;
          let lowestFretBelowMelody = 999;
          let lowestFretAny = 999;

          for (const chordNote of chordNotes) {
            for (let octave = 2; octave <= 5; octave++) {
              const pitch = `${chordNote}${octave}`;
              if (melodyNotePitches.has(pitch)) continue;

              const position = findFretPositionOnString(pitch, stringIndex);
              if (position) {
                const noteOrder = getOrder(pitch);
                if (noteOrder < maxMelodyNoteOrder) {
                  if (position.fret < lowestFretBelowMelody) {
                    bestPositionBelowMelody = { ...position, note: chordNote, pitch };
                    lowestFretBelowMelody = position.fret;
                  }
                } else if (position.fret < lowestFretAny) {
                  foundPosition = { ...position, note: chordNote, pitch };
                  lowestFretAny = position.fret;
                }
              }
            }
          }

          const positionToUse = bestPositionBelowMelody || foundPosition;
          if (positionToUse) {
            chordPositions.push(positionToUse);
            usedStrings.add(stringIndex);
          }
        }
      }
    }

    // Add chord positions as ukulele notes
    chordPositions.forEach(pos => {
      const timeKey = `${chordStart}-${pos.pitch}-${pos.string}`;
      if (!processedTimes.has(timeKey)) {
        ukuleleNotes.push({
          pitch: pos.pitch,
          startTime: chordStart,
          duration: chord.duration,
          stringIndex: pos.string
        });
        processedTimes.add(timeKey);
      }
    });
  });

  // Add melody notes
  notes.forEach(note => {
    const position = findBestFretPosition(note.pitch);
    if (position) {
      const timeKey = `${note.startTime}-${note.pitch}-${position.string}`;
      if (!processedTimes.has(timeKey)) {
        ukuleleNotes.push({
          pitch: note.pitch,
          startTime: note.startTime,
          duration: note.duration,
          stringIndex: position.string
        });
        processedTimes.add(timeKey);
      }
    }
  });

  return ukuleleNotes.sort((a, b) => a.startTime - b.startTime);
}

// Check if a pitch is within the playable range of ukulele
function isWithinUkuleleRange(pitch: string): boolean {
  const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const getOrder = (p: string) => {
    const noteName = p.replace(/\d+/, '').replace(/b/g, '#');
    const octave = parseInt(p.match(/\d+/)?.[0] || '4');
    const noteIndex = chromatic.indexOf(noteName);
    return octave * 12 + noteIndex;
  };

  const pitchOrder = getOrder(pitch);
  const minOrder = getOrder(getMinUkulelePitch());
  const maxOrder = getOrder(getMaxUkulelePitch());

  return pitchOrder >= minOrder && pitchOrder <= maxOrder;
}

export function PianoRoll() {
  const { song, isChromatic, selectedDuration, currentBeat, cursorPosition, isPlaying, addNote, updateNote, deleteNote, selectedNoteId, setSelectedNoteId, setSelectedDuration, setCursorPosition, selectedChordId, setSelectedChordId, updateChord, deleteChord, isEditMode } = useStore();

  // Extract key explicitly for better React dependency tracking
  const currentKey = song.key;
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [resizingNote, setResizingNote] = useState<string | null>(null);
  const [draggedChord, setDraggedChord] = useState<string | null>(null);
  const [resizingChord, setResizingChord] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, startTime: 0, pitch: '' });
  const containerRef = useRef<HTMLDivElement>(null);

  // Note selector state
  const [selectorState, setSelectorState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    stringIndex: number;
    options: NoteOption[];
    timePosition: number;
  } | null>(null);

  // Calculate base octave and notes based on the key, memoized to react to key changes
  const baseNotes = useMemo(() => {
    // Calculate base octave based on the key's root note
    const getBaseOctave = (key: string): number => {
      const scaleNotes = MAJOR_SCALES[key] || MAJOR_SCALES['C Major'];
      const rootNote = scaleNotes[0]; // First note of the scale is the root

      // Map root notes to their preferred octave for better display
      const octaveMap: Record<string, number> = {
        'C': 4, 'C#': 4, 'Db': 4,
        'D': 4, 'D#': 4, 'Eb': 4,
        'E': 4, 'F': 4, 'F#': 4, 'Gb': 4,
        'G': 4, 'G#': 4, 'Ab': 4,
        'A': 4, 'A#': 4, 'Bb': 4,
        'B': 4
      };

      return octaveMap[rootNote] || 4;
    };

    const baseOctave = getBaseOctave(currentKey);

    // Generate base notes for the current key and octave
    if (isChromatic) {
      return CHROMATIC_NOTES.map(n => `${n}${baseOctave}`);
    } else {
      const scaleNotes = MAJOR_SCALES[currentKey] || MAJOR_SCALES['C Major'];
      const rootNote = scaleNotes[0];

      // Create a full octave from root note to next root note
      const pitchOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const rootIndex = pitchOrder.indexOf(rootNote.replace('b', '#'));

      const notes: string[] = [];

      // Add notes from the scale, calculating correct octaves
      scaleNotes.forEach((note) => {
        const noteIndex = pitchOrder.indexOf(note.replace('b', '#'));
        // If the note comes before the root note in chromatic order, it's in the next octave
        const octave = noteIndex < rootIndex ? baseOctave + 1 : baseOctave;
        notes.push(`${note}${octave}`);
      });

      return notes;
    }
  }, [currentKey, isChromatic]); // Re-calculate when key or chromatic mode changes


  // Calculate all pitches to display, memoized to react to key and note changes
  const allPitches = useMemo(() => {
    if (isChromatic) {
      // For chromatic mode, use the old logic
      const pitchOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const getOrder = (pitch: string) => {
        const noteName = pitch.replace(/\d+/, '');
        const octave = parseInt(pitch.match(/\d+/)?.[0] || '4');
        const noteIndex = pitchOrder.indexOf(noteName);
        return octave * 12 + noteIndex;
      };

      const usedPitches = song.notes.map(n => n.pitch);
      const baseOrder = baseNotes.map(getOrder);
      const minBaseOrder = Math.min(...baseOrder);
      const maxBaseOrder = Math.max(...baseOrder);

      let minOrder = minBaseOrder;
      let maxOrder = maxBaseOrder;

      if (usedPitches.length > 0) {
        const usedOrders = usedPitches.map(getOrder);
        const minUsedOrder = Math.min(...usedOrders);
        const maxUsedOrder = Math.max(...usedOrders);

        if (minUsedOrder < minBaseOrder) {
          minOrder = minUsedOrder;
        }
        if (maxUsedOrder > maxBaseOrder) {
          maxOrder = maxUsedOrder;
        }
      }

      const pitches: string[] = [];
      for (let order = minOrder; order <= maxOrder; order++) {
        const octave = Math.floor(order / 12);
        const noteIndex = order % 12;
        const pitch = pitchOrder[noteIndex] + octave;
        pitches.push(pitch);
      }

      return pitches;
    } else {
      // For scale mode, use the base notes directly and extend if needed
      const usedPitches = song.notes.map(n => n.pitch);
      let pitches = [...baseNotes];

      // Add any used pitches that are not in the base notes
      usedPitches.forEach(pitch => {
        if (!pitches.includes(pitch)) {
          pitches.push(pitch);
        }
      });

      // Sort pitches by their chromatic order for display
      const pitchOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const getOrder = (pitch: string) => {
        const noteName = pitch.replace(/\d+/, '');
        const octave = parseInt(pitch.match(/\d+/)?.[0] || '4');
        const noteIndex = pitchOrder.indexOf(noteName);
        return octave * 12 + noteIndex;
      };

      pitches.sort((a, b) => getOrder(a) - getOrder(b));

      return pitches;
    }
  }, [baseNotes, song.notes, isChromatic]); // Re-calculate when key, notes, or chromatic mode changes

  const reversedNotes = [...allPitches].reverse();
  const beatsPerRow = 20;

  const maxNoteEnd = song.notes.reduce((max, note) =>
    Math.max(max, note.startTime + note.duration), beatsPerRow
  );
  const maxChordEnd = song.chords.reduce((max, chord) =>
    Math.max(max, chord.startTime + chord.duration), beatsPerRow
  );
  const maxEnd = Math.max(maxNoteEnd, maxChordEnd);
  const totalRows = Math.ceil(maxEnd / beatsPerRow);

  // Helper function to get the chord colors for a specific beat and pitch
  // Returns an array of chord segments that should be colored in this beat
  const getChordColorsForBeat = (beat: number, pitch: string): Array<{ color: string; startOffset: number; coverage: number }> => {
    // Find all chords active at this beat range (beat to beat+1)
    const beatEndTime = beat + 1;
    const activeChords = song.chords.filter(
      chord => {
        const chordEndTime = chord.startTime + chord.duration;
        // Chord is active if it overlaps with this beat cell [beat, beat+1)
        return chord.startTime < beatEndTime && chordEndTime > beat;
      }
    );

    if (activeChords.length === 0) return [];

    // Extract the note name without octave
    const pitchName = pitch.replace(/\d+/, '').replace(/b/g, '#');

    const segments: Array<{ color: string; startOffset: number; coverage: number }> = [];

    // Process each chord and create segments
    for (const chord of activeChords) {
      // Get the notes in this chord
      const chordNotes = getChordNotes(chord.roman, song.key);

      // Check if this pitch is in the chord
      const isInChord = chordNotes.some(chordNote => {
        const normalizedChordNote = chordNote.replace(/b/g, '#');
        return normalizedChordNote === pitchName;
      });

      if (!isInChord) continue;

      // Get the base color for this note
      const baseColor = NOTE_COLORS[pitchName.replace('#', '')] || '#888';

      // Calculate how much of this beat cell should be colored
      const chordStartTime = chord.startTime;
      const chordEndTime = chordStartTime + chord.duration;

      // Calculate the overlap between the chord and this beat cell
      const overlapStart = Math.max(beat, chordStartTime);
      const overlapEnd = Math.min(beatEndTime, chordEndTime);

      // Start offset: where within the beat cell does the chord begin (0-1)
      const startOffset = overlapStart - beat;
      // Coverage: how much of the beat cell is covered (0-1)
      const coverage = overlapEnd - overlapStart;

      segments.push({
        color: baseColor + '20', // 20 is hex for ~12% opacity for a subtle pastel effect
        startOffset,
        coverage
      });
    }

    return segments;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedNoteId) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          deleteNote(selectedNoteId);
          return;
        }
      }

      if (selectedChordId) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          deleteChord(selectedChordId);
          return;
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const chord = song.chords.find(c => c.id === selectedChordId);
          if (!chord) return;

          const romanNumerals: ('I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII')[] = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
          const currentIndex = romanNumerals.indexOf(chord.roman);

          let newRoman: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII';
          if (e.key === 'ArrowUp') {
            // Can't go higher than VII
            if (currentIndex >= romanNumerals.length - 1) return;
            newRoman = romanNumerals[currentIndex + 1];
          } else {
            // Can't go lower than I
            if (currentIndex <= 0) return;
            newRoman = romanNumerals[currentIndex - 1];
          }

          updateChord(selectedChordId, { roman: newRoman });
          audioEngine.playChord(newRoman, song.key, chord.duration);
          return;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          const chord = song.chords.find(c => c.id === selectedChordId);
          if (!chord) return;

          const timeDelta = e.key === 'ArrowLeft' ? -0.25 : 0.25;
          const newStartTime = Math.max(0, chord.startTime + timeDelta);

          if (newStartTime !== chord.startTime) {
            // Check for collisions with other chords
            const wouldCollide = song.chords.some(c => {
              if (c.id === selectedChordId) return false;
              const newEndTime = newStartTime + chord.duration;
              const existingEndTime = c.startTime + c.duration;
              return (newStartTime < existingEndTime && newEndTime > c.startTime);
            });

            if (!wouldCollide) {
              updateChord(selectedChordId, { startTime: newStartTime });
              setCursorPosition(newStartTime + chord.duration);
              audioEngine.playChord(chord.roman, song.key, chord.duration);
            }
          }
          return;
        }
      }

      if (!selectedNoteId) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteNote(selectedNoteId);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const note = song.notes.find(n => n.id === selectedNoteId);
        if (!note) return;

        const allPitchOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const scalePitchOrder = (MAJOR_SCALES[song.key] || MAJOR_SCALES['C Major']).map(n => n.replace(/b/g, '#'));

        const pitchOrder = isChromatic ? allPitchOrder : scalePitchOrder;

        const noteName = note.pitch.replace(/\d+/, '').replace(/b/g, '#');
        const octave = parseInt(note.pitch.match(/\d+/)?.[0] || '4');
        const noteIndex = pitchOrder.indexOf(noteName);

        // Helper function to get the next pitch in the given direction
        const getNextPitch = (currentIndex: number, currentOctave: number, direction: 'up' | 'down'): string => {
          if (direction === 'up') {
            if (currentIndex === pitchOrder.length - 1) {
              const currentChromaticIndex = allPitchOrder.indexOf(pitchOrder[currentIndex]);
              const nextScaleNote = pitchOrder[0];
              const nextChromaticIndex = allPitchOrder.indexOf(nextScaleNote);
              if (nextChromaticIndex > currentChromaticIndex) {
                return pitchOrder[0] + currentOctave;
              } else {
                return pitchOrder[0] + (currentOctave + 1);
              }
            } else {
              const currentChromaticIndex = allPitchOrder.indexOf(pitchOrder[currentIndex]);
              const nextScaleNote = pitchOrder[currentIndex + 1];
              const nextChromaticIndex = allPitchOrder.indexOf(nextScaleNote);
              if (nextChromaticIndex > currentChromaticIndex) {
                return pitchOrder[currentIndex + 1] + currentOctave;
              } else {
                return pitchOrder[currentIndex + 1] + (currentOctave + 1);
              }
            }
          } else {
            if (currentIndex === 0) {
              const currentChromaticIndex = allPitchOrder.indexOf(pitchOrder[currentIndex]);
              const prevScaleNote = pitchOrder[pitchOrder.length - 1];
              const prevChromaticIndex = allPitchOrder.indexOf(prevScaleNote);
              if (prevChromaticIndex < currentChromaticIndex) {
                return pitchOrder[pitchOrder.length - 1] + currentOctave;
              } else {
                return pitchOrder[pitchOrder.length - 1] + (currentOctave - 1);
              }
            } else {
              const currentChromaticIndex = allPitchOrder.indexOf(pitchOrder[currentIndex]);
              const prevScaleNote = pitchOrder[currentIndex - 1];
              const prevChromaticIndex = allPitchOrder.indexOf(prevScaleNote);
              if (prevChromaticIndex < currentChromaticIndex) {
                return pitchOrder[currentIndex - 1] + currentOctave;
              } else {
                return pitchOrder[currentIndex - 1] + (currentOctave - 1);
              }
            }
          }
        };

        // Helper function to check if a pitch has collision
        const hasCollision = (testPitch: string): boolean => {
          return song.notes.some(n => {
            if (n.id === selectedNoteId) return false;
            if (n.pitch !== testPitch) return false;
            const newEndTime = note.startTime + note.duration;
            const existingEndTime = n.startTime + n.duration;
            return (note.startTime < existingEndTime && newEndTime > n.startTime);
          });
        };

        // Find the next available pitch by skipping occupied ones
        let candidatePitch = getNextPitch(noteIndex, octave, e.key === 'ArrowUp' ? 'up' : 'down');
        let candidateNoteName = candidatePitch.replace(/\d+/, '').replace(/b/g, '#');
        let candidateOctave = parseInt(candidatePitch.match(/\d+/)?.[0] || '4');
        let candidateIndex = pitchOrder.indexOf(candidateNoteName);

        // Keep searching for a free position (max 24 semitones in either direction to prevent infinite loop)
        let attempts = 0;
        const maxAttempts = 24;
        while ((hasCollision(candidatePitch) || !isWithinUkuleleRange(candidatePitch)) && attempts < maxAttempts) {
          candidatePitch = getNextPitch(candidateIndex, candidateOctave, e.key === 'ArrowUp' ? 'up' : 'down');
          candidateNoteName = candidatePitch.replace(/\d+/, '').replace(/b/g, '#');
          candidateOctave = parseInt(candidatePitch.match(/\d+/)?.[0] || '4');
          candidateIndex = pitchOrder.indexOf(candidateNoteName);
          attempts++;
        }

        // Only update if we found a valid position within ukulele range
        if (!hasCollision(candidatePitch) && isWithinUkuleleRange(candidatePitch)) {
          updateNote(selectedNoteId, { pitch: candidatePitch });
          audioEngine.playNote(candidatePitch, note.duration);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const note = song.notes.find(n => n.id === selectedNoteId);
        if (!note) return;

        const timeDelta = e.key === 'ArrowLeft' ? -0.25 : 0.25;
        const newStartTime = Math.max(0, note.startTime + timeDelta);

        if (newStartTime !== note.startTime) {
          // Check for collisions with other notes on the same pitch
          const wouldCollide = song.notes.some(n => {
            if (n.id === selectedNoteId) return false;
            if (n.pitch !== note.pitch) return false;
            const newEndTime = newStartTime + note.duration;
            const existingEndTime = n.startTime + n.duration;
            return (newStartTime < existingEndTime && newEndTime > n.startTime);
          });

          if (!wouldCollide) {
            updateNote(selectedNoteId, { startTime: newStartTime });
            setCursorPosition(newStartTime + note.duration);
            audioEngine.playNote(note.pitch, note.duration);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteId, selectedChordId, deleteNote, deleteChord, setSelectedNoteId, song.notes, song.chords, reversedNotes, updateNote, updateChord]);

  const handleBeatLineClick = (e: React.MouseEvent, beat: number) => {
    e.stopPropagation();
    setCursorPosition(beat);

    // Find the last note or chord before this beat position
    const notesBefore = song.notes
      .filter(n => n.startTime < beat)
      .sort((a, b) => b.startTime - a.startTime);

    const chordsBefore = song.chords
      .filter(c => c.startTime < beat)
      .sort((a, b) => b.startTime - a.startTime);

    // Determine which is closer to the beat position
    const lastNote = notesBefore[0];
    const lastChord = chordsBefore[0];

    if (lastNote && lastChord) {
      // Both exist, select the one that's closer (most recent)
      if (lastNote.startTime > lastChord.startTime) {
        setSelectedNoteId(lastNote.id);
        setSelectedChordId(null);
        setSelectedDuration(lastNote.duration as NoteDuration);
      } else {
        setSelectedChordId(lastChord.id);
        setSelectedNoteId(null);
        setSelectedDuration(lastChord.duration as NoteDuration);
      }
    } else if (lastNote) {
      // Only note exists
      setSelectedNoteId(lastNote.id);
      setSelectedChordId(null);
      setSelectedDuration(lastNote.duration as NoteDuration);
    } else if (lastChord) {
      // Only chord exists
      setSelectedChordId(lastChord.id);
      setSelectedNoteId(null);
      setSelectedDuration(lastChord.duration as NoteDuration);
    } else {
      // Nothing before this position
      setSelectedNoteId(null);
      setSelectedChordId(null);
    }
  };

  const handleCellClick = (pitch: string, beat: number) => {
    // Don't allow adding notes outside ukulele range
    if (!isWithinUkuleleRange(pitch)) {
      return;
    }

    const existingNote = song.notes.find(
      n => n.pitch === pitch && beat >= n.startTime && beat < n.startTime + n.duration
    );

    if (!existingNote) {
      // Initialize audio engine if needed (non-blocking)
      audioEngine.initialize();
      audioEngine.playNote(pitch, selectedDuration);

      const newNoteEndTime = beat + selectedDuration;

      const overlappingNotes = song.notes.filter(
        n => n.pitch === pitch && n.startTime >= beat && n.startTime < newNoteEndTime
      );

      if (overlappingNotes.length > 0) {
        const pushAmount = newNoteEndTime - overlappingNotes[0].startTime;

        song.notes
          .filter(n => n.startTime >= overlappingNotes[0].startTime)
          .forEach(n => {
            updateNote(n.id, { startTime: n.startTime + pushAmount });
          });
      }

      const components = durationToComponents(selectedDuration);
      addNote({
        pitch,
        startTime: beat,
        duration: selectedDuration,
        durationComponents: components,
      });
    }
  };

  const handleNoteMouseDown = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    const note = song.notes.find(n => n.id === noteId);
    if (!note) return;

    setSelectedNoteId(noteId);
    setSelectedChordId(null); // Deselect any selected chord
    setSelectedDuration(note.duration as NoteDuration);
    setDraggedNote(noteId);
    setDragStart({ x: e.clientX, y: e.clientY, startTime: note.startTime, pitch: note.pitch });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    setResizingNote(noteId);
    setDragStart({ x: e.clientX, y: 0, startTime: 0, pitch: '' });
  };

  const handleChordMouseDown = (e: React.MouseEvent, chordId: string) => {
    e.stopPropagation();
    const chord = song.chords.find(c => c.id === chordId);
    if (!chord) return;

    setSelectedChordId(chordId);
    setSelectedNoteId(null); // Deselect any selected note
    setSelectedDuration(chord.duration as NoteDuration);
    setDraggedChord(chordId);
    setDragStart({ x: e.clientX, y: e.clientY, startTime: chord.startTime, pitch: '' });
  };

  const handleChordResizeMouseDown = (e: React.MouseEvent, chordId: string) => {
    e.stopPropagation();
    setResizingChord(chordId);
    setDragStart({ x: e.clientX, y: 0, startTime: 0, pitch: '' });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (draggedChord) {
      const deltaX = e.clientX - dragStart.x;
      const beatWidth = 60;

      // Calculate movement in quarter beats (0.25)
      const quarterBeatWidth = beatWidth / 4;
      const quarterBeatDelta = Math.round(deltaX / quarterBeatWidth);
      const beatDelta = quarterBeatDelta * 0.25;

      const chord = song.chords.find(c => c.id === draggedChord);
      if (!chord) return;

      const newStartTime = Math.max(0, dragStart.startTime + beatDelta);

      if (newStartTime !== chord.startTime) {
        // Check for collisions with other chords
        const wouldCollide = song.chords.some(c => {
          if (c.id === draggedChord) return false;
          const newEndTime = newStartTime + chord.duration;
          const existingEndTime = c.startTime + c.duration;
          // Check if the new position would overlap with existing chord
          return (newStartTime < existingEndTime && newEndTime > c.startTime);
        });

        if (!wouldCollide) {
          updateChord(draggedChord, { startTime: newStartTime });
          audioEngine.playChord(chord.roman, song.key, chord.duration);
        }
      }
    } else if (resizingChord) {
      const deltaX = e.clientX - dragStart.x;
      const beatWidth = 60;
      const beatDelta = Math.round(deltaX / beatWidth);

      const chord = song.chords.find(c => c.id === resizingChord);
      if (!chord) return;

      const MAX_DURATION = 7.75;
      const newDuration = Math.max(0.25, Math.min(MAX_DURATION, chord.duration + beatDelta * 0.25));
      if (newDuration !== chord.duration) {
        const newEndTime = chord.startTime + newDuration;
        const oldEndTime = chord.startTime + chord.duration;

        if (newEndTime > oldEndTime) {
          const overlappingChords = song.chords.filter(
            c => c.id !== resizingChord && c.startTime >= oldEndTime && c.startTime < newEndTime
          );

          if (overlappingChords.length > 0) {
            const pushAmount = newEndTime - overlappingChords[0].startTime;
            song.chords
              .filter(c => c.startTime >= overlappingChords[0].startTime)
              .forEach(c => {
                updateChord(c.id, { startTime: c.startTime + pushAmount });
              });
          }
        }

        const newComponents = durationToComponents(newDuration);
        updateChord(resizingChord, { duration: newDuration, durationComponents: newComponents });
        setDragStart({ ...dragStart, x: e.clientX });
        audioEngine.playChord(chord.roman, song.key, newDuration);
      }
    } else if (draggedNote) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const beatWidth = 60;
      const rowHeight = 40;

      // Calculate movement in quarter beats (0.25)
      const quarterBeatWidth = beatWidth / 4;
      const quarterBeatDelta = Math.round(deltaX / quarterBeatWidth);
      const beatDelta = quarterBeatDelta * 0.25;
      const pitchDelta = Math.round(deltaY / rowHeight);

      const note = song.notes.find(n => n.id === draggedNote);
      if (!note) return;

      const newStartTime = Math.max(0, dragStart.startTime + beatDelta);
      const currentPitchIndex = reversedNotes.indexOf(dragStart.pitch);
      const newPitchIndex = Math.max(0, Math.min(reversedNotes.length - 1, currentPitchIndex + pitchDelta));
      const newPitch = reversedNotes[newPitchIndex];

      if (newStartTime !== note.startTime || newPitch !== note.pitch) {
        // Check if new pitch is within ukulele range
        if (!isWithinUkuleleRange(newPitch)) {
          return; // Don't allow moving outside ukulele range
        }

        // Check for collisions with other notes on the same pitch
        const wouldCollide = song.notes.some(n => {
          if (n.id === draggedNote) return false;
          if (n.pitch !== newPitch) return false;
          const newEndTime = newStartTime + note.duration;
          const existingEndTime = n.startTime + n.duration;
          // Check if the new position would overlap with existing note
          return (newStartTime < existingEndTime && newEndTime > n.startTime);
        });

        if (!wouldCollide) {
          updateNote(draggedNote, { startTime: newStartTime, pitch: newPitch });
          audioEngine.playNote(newPitch, note.duration);
        }
      }
    } else if (resizingNote) {
      const deltaX = e.clientX - dragStart.x;
      const beatWidth = 60;
      const beatDelta = Math.round(deltaX / beatWidth);

      const note = song.notes.find(n => n.id === resizingNote);
      if (!note) return;

      const MAX_DURATION = 7.75;
      const newDuration = Math.max(0.25, Math.min(MAX_DURATION, note.duration + beatDelta * 0.25));
      if (newDuration !== note.duration) {
        const newEndTime = note.startTime + newDuration;
        const oldEndTime = note.startTime + note.duration;

        if (newEndTime > oldEndTime) {
          const overlappingNotes = song.notes.filter(
            n => n.id !== resizingNote && n.pitch === note.pitch && n.startTime >= oldEndTime && n.startTime < newEndTime
          );

          if (overlappingNotes.length > 0) {
            const pushAmount = newEndTime - overlappingNotes[0].startTime;
            song.notes
              .filter(n => n.startTime >= overlappingNotes[0].startTime)
              .forEach(n => {
                updateNote(n.id, { startTime: n.startTime + pushAmount });
              });
          }
        }

        const newComponents = durationToComponents(newDuration);
        updateNote(resizingNote, { duration: newDuration, durationComponents: newComponents });
        setDragStart({ ...dragStart, x: e.clientX });
        audioEngine.playNote(note.pitch, newDuration);
      }
    }
  };

  const handleMouseUp = () => {
    if (draggedChord) {
      const chord = song.chords.find(c => c.id === draggedChord);
      if (chord) {
        setCursorPosition(chord.startTime + chord.duration);
      }
    } else if (resizingChord) {
      const chord = song.chords.find(c => c.id === resizingChord);
      if (chord) {
        setCursorPosition(chord.startTime + chord.duration);
      }
    } else if (draggedNote) {
      const note = song.notes.find(n => n.id === draggedNote);
      if (note) {
        setCursorPosition(note.startTime + note.duration);
      }
    } else if (resizingNote) {
      const note = song.notes.find(n => n.id === resizingNote);
      if (note) {
        setCursorPosition(note.startTime + note.duration);
      }
    }
    setDraggedNote(null);
    setResizingNote(null);
    setDraggedChord(null);
    setResizingChord(null);
  };

  useEffect(() => {
    if (draggedNote || resizingNote || draggedChord || resizingChord) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedNote, resizingNote, draggedChord, resizingChord, dragStart, song.notes, song.chords]);

  const displayPosition = isPlaying ? currentBeat : cursorPosition;

  const handleSelectorSelect = (option: NoteOption) => {
    if (!selectorState) return;

    const { stringIndex, timePosition } = selectorState;

    if (option.pitch === null) {
      // Empty note selected - set preferredString to -1 to hide from tablature
      // This keeps the melody note in piano roll but removes it from tablature display
      const noteOnThisString = song.notes.find(n => {
        if (n.startTime !== timePosition) return false;

        // Check if this note is currently shown on this string
        if (n.preferredString === stringIndex) {
          return true;
        }

        // Or if it has no preference but would default to this string
        if (n.preferredString === undefined) {
          const defaultPosition = findBestFretPosition(n.pitch);
          return defaultPosition && defaultPosition.string === stringIndex;
        }

        return false;
      });

      if (noteOnThisString) {
        // Set preferredString to -1 to indicate "don't show in tablature"
        // The note itself stays in the piano roll
        updateNote(noteOnThisString.id, { preferredString: -1 });
      }
    } else {
      // Find if there's already a note at this time position with this pitch
      const existingNote = song.notes.find(n => n.startTime === timePosition && n.pitch === option.pitch);

      if (existingNote) {
        // IMPORTANT: We need to handle the case where we're moving an existing note
        // to a string that currently has a different note

        // First, find what's currently on the target string
        const noteOnTargetString = song.notes.find(n => {
          if (n.startTime !== timePosition || n.id === existingNote.id) return false;

          const noteString = n.preferredString !== undefined && n.preferredString >= 0
            ? n.preferredString
            : findBestFretPosition(n.pitch)?.string;

          return noteString === stringIndex;
        });

        // We need to update both notes in sequence
        // Use setTimeout to ensure the first update completes before the second
        if (noteOnTargetString) {
          updateNote(noteOnTargetString.id, { preferredString: -1 });
          // Small delay to ensure the first update is processed
          setTimeout(() => {
            updateNote(existingNote.id, { preferredString: stringIndex });
          }, 0);
        } else {
          updateNote(existingNote.id, { preferredString: stringIndex });
        }
      } else {
        // No existing note with this pitch, create a new one
        // But first check if there's a different note on this string at this time
        const noteOnTargetString = song.notes.find(n => {
          if (n.startTime !== timePosition) return false;

          const noteString = n.preferredString !== undefined && n.preferredString >= 0
            ? n.preferredString
            : findBestFretPosition(n.pitch)?.string;

          return noteString === stringIndex;
        });

        // If there's a note on the target string, hide it
        if (noteOnTargetString) {
          updateNote(noteOnTargetString.id, { preferredString: -1 });
          // Small delay before creating new note
          setTimeout(() => {
            if (option.pitch) {
              const components = durationToComponents(selectedDuration);
              addNote({
                pitch: option.pitch,
                startTime: timePosition,
                duration: selectedDuration,
                durationComponents: components,
                preferredString: stringIndex,
              });
            }
          }, 0);
        } else {
          const components = durationToComponents(selectedDuration);
          addNote({
            pitch: option.pitch,
            startTime: timePosition,
            duration: selectedDuration,
            durationComponents: components,
            preferredString: stringIndex,
          });
        }
      }
    }

    setSelectorState(null);
  };

  const handleSelectorClose = () => {
    setSelectorState(null);
  };

  return (
    <Container ref={containerRef}>
      {Array.from({ length: totalRows }).map((_, rowIndex) => {
        const rowStartBeat = rowIndex * beatsPerRow;
        const rowEndBeat = (rowIndex + 1) * beatsPerRow;

        return (
          <Grid key={rowIndex}>
            {displayPosition >= rowStartBeat && displayPosition < rowEndBeat && (
              <PlaybackCursor $position={50 + (displayPosition - rowStartBeat) * 60} />
            )}
            {reversedNotes.map((pitch) => (
              <Row key={pitch}>
                <NoteLabel>{pitch}</NoteLabel>
                <Timeline>
                  {Array.from({ length: beatsPerRow }).map((_, beatIndex) => {
                    const absoluteBeat = rowStartBeat + beatIndex;
                    const chordSegments = getChordColorsForBeat(absoluteBeat, pitch);
                    return (
                      <Beat
                        key={`${pitch}-${absoluteBeat}`}
                        $isMeasureStart={absoluteBeat % song.meter.beatsPerMeasure === 0}
                        $chordSegments={chordSegments.length > 0 ? chordSegments : undefined}
                        onClick={() => handleCellClick(pitch, absoluteBeat)}
                      >
                        <BeatClickArea onClick={(e) => handleBeatLineClick(e, absoluteBeat)} />
                      </Beat>
                    );
                  })}
                  <EndBar />
                  {song.notes
                    .filter(note =>
                      note.pitch === pitch &&
                      ((note.startTime >= rowStartBeat && note.startTime < rowEndBeat) ||
                       (note.startTime < rowStartBeat && note.startTime + note.duration > rowStartBeat))
                    )
                    .map(note => {
                      const noteName = note.pitch.replace(/\d+/, '');
                      const color = NOTE_COLORS[noteName.replace('#', '').replace('b', '')] || '#888';
                      const isNoteCurrentlyPlaying = isPlaying &&
                        currentBeat >= note.startTime &&
                        currentBeat < note.startTime + note.duration;

                      const noteStart = note.startTime;
                      const noteEnd = note.startTime + note.duration;

                      const visibleStart = Math.max(noteStart, rowStartBeat);
                      const visibleEnd = Math.min(noteEnd, rowEndBeat);

                      const relativeStart = visibleStart - rowStartBeat;
                      const visibleDuration = visibleEnd - visibleStart;

                      const isContinuation = noteStart < rowStartBeat;

                      return (
                        <NoteBlock
                          key={`${note.id}-${rowIndex}`}
                          $color={color}
                          $selected={selectedNoteId === note.id}
                          $isPlaying={isNoteCurrentlyPlaying}
                          style={{
                            left: `${relativeStart * 60 + 1}px`,
                            width: `${visibleDuration * 60 - 2}px`,
                          }}
                          onMouseDown={(e) => handleNoteMouseDown(e, note.id)}
                        >
                          {!isContinuation && noteName}
                          {!isContinuation && <ResizeHandle onMouseDown={(e) => handleResizeMouseDown(e, note.id)} />}
                        </NoteBlock>
                      );
                    })}
                </Timeline>
              </Row>
            ))}
            <ChordRow>
              <ChordLabel>Chords</ChordLabel>
              <ChordTimeline>
                {Array.from({ length: beatsPerRow }).map((_, beatIndex) => {
                  const absoluteBeat = rowStartBeat + beatIndex;
                  return (
                    <Beat
                      key={beatIndex}
                      $isMeasureStart={absoluteBeat % song.meter.beatsPerMeasure === 0}
                    >
                      <BeatClickArea onClick={(e) => handleBeatLineClick(e, absoluteBeat)} />
                    </Beat>
                  );
                })}
                <EndBar />
                {song.chords
                  .filter(chord =>
                    (chord.startTime >= rowStartBeat && chord.startTime < rowEndBeat) ||
                    (chord.startTime < rowStartBeat && chord.startTime + chord.duration > rowStartBeat)
                  )
                  .map(chord => {
                    const isChordCurrentlyPlaying = isPlaying &&
                      currentBeat >= chord.startTime &&
                      currentBeat < chord.startTime + chord.duration;

                    const chordStart = chord.startTime;
                    const chordEnd = chord.startTime + chord.duration;

                    const visibleStart = Math.max(chordStart, rowStartBeat);
                    const visibleEnd = Math.min(chordEnd, rowEndBeat);

                    const relativeStart = visibleStart - rowStartBeat;
                    const visibleDuration = visibleEnd - visibleStart;

                    const isContinuation = chordStart < rowStartBeat;

                    const chordInfo = getChordInfo(chord.roman, song.key);
                    const qualitySuffix = chordInfo.quality === 'minor' ? 'm' : chordInfo.quality === 'diminished' ? '°' : '';

                    return (
                      <ChordBlock
                        key={`${chord.id}-${rowIndex}`}
                        $selected={selectedChordId === chord.id}
                        $isPlaying={isChordCurrentlyPlaying}
                        $color={chordInfo.color}
                        style={{
                          left: `${relativeStart * 60 + 1}px`,
                          width: `${visibleDuration * 60 - 2}px`,
                        }}
                        onMouseDown={(e) => handleChordMouseDown(e, chord.id)}
                      >
                        {!isContinuation && (
                          <>
                            <ChordRomanLabel>{chord.roman}</ChordRomanLabel>
                            <ChordNameLabel>{chordInfo.name}{qualitySuffix}</ChordNameLabel>
                          </>
                        )}
                        {!isContinuation && <ResizeHandle onMouseDown={(e) => handleChordResizeMouseDown(e, chord.id)} />}
                      </ChordBlock>
                    );
                  })}
              </ChordTimeline>
            </ChordRow>
            <TablatureRow>
              <TablatureLabel>Ukulele</TablatureLabel>
              <TablatureTimeline>
                {Array.from({ length: beatsPerRow }).map((_, beatIndex) => {
                  const absoluteBeat = rowStartBeat + beatIndex;
                  return (
                    <Beat
                      key={beatIndex}
                      $isMeasureStart={absoluteBeat % song.meter.beatsPerMeasure === 0}
                    >
                      <BeatClickArea onClick={(e) => handleBeatLineClick(e, absoluteBeat)} />
                    </Beat>
                  );
                })}
                <EndBar />
                {/* Render ukulele strings */}
                {UKULELE_TUNING.map((_, index) => (
                  <TablatureString key={index} $stringIndex={index} />
                ))}
                {/* Render chords on tablature FIRST */}
                {song.chords
                  .filter(chord =>
                    (chord.startTime >= rowStartBeat && chord.startTime < rowEndBeat) ||
                    (chord.startTime < rowStartBeat && chord.startTime + chord.duration > rowStartBeat)
                  )
                  .map(chord => {
                    const chordNotes = getChordNotes(chord.roman, song.key);
                    const chordInfo = getChordInfo(chord.roman, song.key);

                    const chordStart = chord.startTime;
                    const chordEnd = chord.startTime + chord.duration;

                    const visibleStart = Math.max(chordStart, rowStartBeat);

                    const relativeStart = visibleStart - rowStartBeat;

                    // Find all melody notes at this time
                    const overlappingNotes = song.notes.filter(
                      n => n.startTime < chordEnd && n.startTime + n.duration > chordStart
                    );

                    const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                    const getOrder = (pitch: string) => {
                      const noteName = pitch.replace(/\d+/, '').replace(/b/g, '#');
                      const octave = parseInt(pitch.match(/\d+/)?.[0] || '4');
                      const noteIndex = chromatic.indexOf(noteName);
                      return octave * 12 + noteIndex;
                    };

                    let maxMelodyNoteOrder = -1;
                    const melodyNotePitches = new Set<string>();
                    if (overlappingNotes.length > 0) {
                      maxMelodyNoteOrder = Math.max(...overlappingNotes.map(n => getOrder(n.pitch)));
                      // Store all melody note pitches to avoid duplicates
                      overlappingNotes.forEach(n => melodyNotePitches.add(n.pitch));
                    }

                    // Helper function to check if chord positions are strummable (no gaps)
                    const isStrummable = (positions: Array<{ string: number; fret: number; note: string; pitch: string }>): boolean => {
                      if (positions.length === 0) return false;
                      if (positions.length === 1) return true;

                      // Sort positions by string index
                      const sortedStrings = positions.map(p => p.string).sort((a, b) => a - b);

                      // Check if there are any gaps between strings
                      for (let i = 0; i < sortedStrings.length - 1; i++) {
                        if (sortedStrings[i + 1] - sortedStrings[i] > 1) {
                          return false; // Gap found
                        }
                      }

                      return true;
                    };

                    // Try to find fret positions for chord notes
                    let chordPositions: Array<{ string: number; fret: number; note: string; pitch: string }> = [];

                    // If no melody notes overlap, use standard ukulele chord shape
                    if (overlappingNotes.length === 0) {
                      const chordShape = getUkuleleChordShape(chord.roman, song.key);

                      chordShape.forEach((fret, stringIndex) => {
                        const pitch = getNoteFromFret(stringIndex, fret);
                        const noteName = pitch.replace(/\d+/, '').replace(/b/g, '#');
                        chordPositions.push({
                          string: stringIndex,
                          fret: fret,
                          note: noteName,
                          pitch: pitch
                        });
                      });
                    } else {
                      // If melody notes exist, try to fill all 4 strings with chord notes
                      // For each string, find the best chord note that fits
                      for (let stringIndex = 0; stringIndex < UKULELE_TUNING.length; stringIndex++) {
                        let bestPosition = null;
                        let lowestFret = 999;

                        // Try each chord note on this string
                        for (const chordNote of chordNotes) {
                          // Try different octaves, starting from low to high for better voice leading
                          for (let octave = 2; octave <= 5; octave++) {
                            const pitch = `${chordNote}${octave}`;
                            const noteOrder = getOrder(pitch);

                            // Skip if this pitch is already played as a melody note
                            if (melodyNotePitches.has(pitch)) {
                              continue;
                            }

                            // Only use this chord note if it's below the highest melody note
                            if (noteOrder < maxMelodyNoteOrder) {
                              // Check if this pitch can be played on this specific string
                              const position = findFretPositionOnString(pitch, stringIndex);
                              if (position && position.fret < lowestFret) {
                                bestPosition = { ...position, note: chordNote, pitch };
                                lowestFret = position.fret;
                              }
                            }
                          }
                        }

                        // If we found a valid position for this string, add it
                        if (bestPosition) {
                          chordPositions.push(bestPosition);
                        }
                      }

                      // Check if the positions are strummable
                      if (!isStrummable(chordPositions)) {
                        // Try to fill gaps with chord notes
                        chordPositions.sort((a, b) => a.string - b.string);

                        // Find which strings are missing
                        const usedStrings = new Set(chordPositions.map(p => p.string));
                        const minString = Math.min(...chordPositions.map(p => p.string));
                        const maxString = Math.max(...chordPositions.map(p => p.string));

                        // Try to fill gaps between min and max string
                        for (let stringIndex = minString; stringIndex <= maxString; stringIndex++) {
                          if (usedStrings.has(stringIndex)) continue;

                          // Try to find a chord note for this string
                          let foundPosition = null;
                          let bestPositionBelowMelody = null;
                          let lowestFretBelowMelody = 999;
                          let lowestFretAny = 999;

                          // Try each chord note on this string
                          for (const chordNote of chordNotes) {
                            // Try different octaves, prioritizing lower octaves
                            for (let octave = 2; octave <= 5; octave++) {
                              const pitch = `${chordNote}${octave}`;

                              // Skip if this pitch is already played as a melody note
                              if (melodyNotePitches.has(pitch)) {
                                continue;
                              }

                              // Check if this pitch can be played on this specific string
                              const position = findFretPositionOnString(pitch, stringIndex);
                              if (position) {
                                const noteOrder = getOrder(pitch);

                                // Prefer notes below the melody, but accept any chord note if needed
                                if (noteOrder < maxMelodyNoteOrder) {
                                  // This is below the melody - prefer this with lowest fret
                                  if (position.fret < lowestFretBelowMelody) {
                                    bestPositionBelowMelody = { ...position, note: chordNote, pitch };
                                    lowestFretBelowMelody = position.fret;
                                  }
                                } else if (position.fret < lowestFretAny) {
                                  // This is at or above melody - use as fallback with lowest fret
                                  foundPosition = { ...position, note: chordNote, pitch };
                                  lowestFretAny = position.fret;
                                }
                              }
                            }
                          }

                          // Prefer position below melody, fall back to any position
                          const positionToUse = bestPositionBelowMelody || foundPosition;
                          if (positionToUse) {
                            chordPositions.push(positionToUse);
                            usedStrings.add(stringIndex);
                          }
                        }

                        // Re-sort after adding gap fillers
                        chordPositions.sort((a, b) => a.string - b.string);
                      }
                    }

                    // Position the markers at the start of the chord (left edge)
                    const markerX = relativeStart * 60 - 15;

                    return chordPositions.map((pos, idx) => {
                      const color = NOTE_COLORS[pos.note.replace('#', '').replace('b', '')] || chordInfo.color;
                      const markerY = STRING_POSITIONS[pos.string] - 15;

                      return (
                        <TablatureFretMarker
                          key={`${chord.id}-${idx}-${rowIndex}`}
                          $color={color}
                          $selected={selectedChordId === chord.id}
                          style={{
                            left: `${markerX}px`,
                            top: `${markerY}px`,
                          }}
                        >
                          {pos.fret === 0 ? 'O' : pos.fret}
                        </TablatureFretMarker>
                      );
                    });
                  })}
                {/* Render notes on tablature LAST (so they appear on top) */}
                {song.notes
                  .filter(note => {
                    // Don't show notes that are explicitly hidden from tablature
                    if (note.preferredString === -1) return false;

                    // Filter by row visibility
                    const inRow = (note.startTime >= rowStartBeat && note.startTime < rowEndBeat) ||
                      (note.startTime < rowStartBeat && note.startTime + note.duration > rowStartBeat);

                    // Check if note is playable on ukulele (within 12-fret range)
                    if (!inRow) return false;

                    // Check if note has a preferred string
                    if (note.preferredString !== undefined && note.preferredString >= 0) {
                      const position = findFretPositionOnString(note.pitch, note.preferredString);
                      return position !== null;
                    }

                    const position = findBestFretPosition(note.pitch);
                    return position !== null;
                  })
                  .map(note => {
                    // Use preferred string if available, otherwise use best position
                    const position = note.preferredString !== undefined && note.preferredString >= 0
                      ? findFretPositionOnString(note.pitch, note.preferredString)
                      : findBestFretPosition(note.pitch);
                    if (!position) return null;

                    const noteName = note.pitch.replace(/\d+/, '');
                    const color = NOTE_COLORS[noteName.replace('#', '').replace('b', '')] || '#888';

                    const noteStart = note.startTime;

                    const visibleStart = Math.max(noteStart, rowStartBeat);

                    const relativeStart = visibleStart - rowStartBeat;

                    // Position the marker at the start of the note (left edge)
                    const markerX = relativeStart * 60 - 15;
                    const markerY = STRING_POSITIONS[position.string] - 15;

                    const handleMarkerClick = (e: React.MouseEvent) => {
                      if (!isEditMode) return;
                      e.stopPropagation();

                      // Get all pitches available at this time (including hidden notes)
                      const availablePitches = getAllPitchesAtTime(note.startTime, song.notes, song.chords, song.key);

                      // Find which pitches can be played on this string
                      const options: NoteOption[] = [];

                      // Always add empty note option
                      options.push({
                        pitch: null,
                        fret: -1,
                        noteName: ''
                      });

                      // Add all playable pitches on this string
                      availablePitches.forEach(pitch => {
                        const pos = findFretPositionOnString(pitch, position.string);
                        if (pos) {
                          const noteName = pitch.slice(0, -1);
                          options.push({
                            pitch: pitch,
                            fret: pos.fret,
                            noteName: noteName
                          });
                        }
                      });

                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      const containerRect = containerRef.current?.getBoundingClientRect();
                      if (containerRect) {
                        setSelectorState({
                          visible: true,
                          x: rect.left - containerRect.left,
                          y: rect.top - containerRect.top,
                          stringIndex: position.string,
                          options: options,
                          timePosition: note.startTime
                        });
                      }
                    };

                    return (
                      <TablatureFretMarker
                        key={`${note.id}-${rowIndex}`}
                        $color={color}
                        $selected={selectedNoteId === note.id}
                        style={{
                          left: `${markerX}px`,
                          top: `${markerY}px`,
                        }}
                        onClick={handleMarkerClick}
                      >
                        {position.fret === 0 ? 'O' : position.fret}
                      </TablatureFretMarker>
                    );
                  })}
                {/* Render empty note placeholders */}
                {isEditMode && (() => {
                  const placeholders: React.ReactElement[] = [];

                  // For each beat in this row
                  for (let beatIndex = 0; beatIndex < beatsPerRow; beatIndex++) {
                    const absoluteBeat = rowStartBeat + beatIndex;

                    // For each string
                    for (let stringIndex = 0; stringIndex < UKULELE_TUNING.length; stringIndex++) {
                      // Check if there's already a note at this position
                      const hasNote = song.notes.some(note => {
                        if (Math.floor(note.startTime) !== absoluteBeat) return false;

                        // Skip notes that are hidden from tablature
                        if (note.preferredString === -1) return false;

                        const notePosition = note.preferredString !== undefined && note.preferredString >= 0
                          ? findFretPositionOnString(note.pitch, note.preferredString)
                          : findBestFretPosition(note.pitch);

                        return notePosition && notePosition.string === stringIndex;
                      });

                      // Check if there's a chord note at this position
                      const hasChordNote = song.chords.some(chord => {
                        if (Math.floor(chord.startTime) !== absoluteBeat) return false;

                        const chordShape = getUkuleleChordShape(chord.roman, song.key);

                        // Check if this string has a chord note
                        return chordShape[stringIndex] !== undefined;
                      });

                      // Only show placeholder if no note and no chord note
                      if (!hasNote && !hasChordNote) {
                        const placeholderX = beatIndex * 60 - 8;
                        const placeholderY = STRING_POSITIONS[stringIndex] - 8;

                        placeholders.push(
                          <EmptyNotePlaceholder
                            key={`empty-${absoluteBeat}-${stringIndex}`}
                            style={{
                              left: `${placeholderX}px`,
                              top: `${placeholderY}px`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();

                              // Get all pitches available at this time
                              const availablePitches = getAllPitchesAtTime(absoluteBeat, song.notes, song.chords, song.key);

                              // Find which pitches can be played on this string
                              const options: NoteOption[] = [];

                              // Always add empty note option
                              options.push({
                                pitch: null,
                                fret: -1,
                                noteName: ''
                              });

                              // Add all playable pitches on this string
                              availablePitches.forEach(pitch => {
                                const pos = findFretPositionOnString(pitch, stringIndex);
                                if (pos) {
                                  const noteName = pitch.slice(0, -1);
                                  options.push({
                                    pitch: pitch,
                                    fret: pos.fret,
                                    noteName: noteName
                                  });
                                }
                              });

                              const rect = (e.target as HTMLElement).getBoundingClientRect();
                              const containerRect = containerRef.current?.getBoundingClientRect();
                              if (containerRect) {
                                setSelectorState({
                                  visible: true,
                                  x: rect.left - containerRect.left,
                                  y: rect.top - containerRect.top,
                                  stringIndex: stringIndex,
                                  options: options,
                                  timePosition: absoluteBeat
                                });
                              }
                            }}
                          >
                            ·
                          </EmptyNotePlaceholder>
                        );
                      }
                    }
                  }

                  return placeholders;
                })()}
              </TablatureTimeline>
            </TablatureRow>
          </Grid>
        );
      })}
      {selectorState && selectorState.visible && (
        <NoteRondel
          x={selectorState.x}
          y={selectorState.y}
          stringIndex={selectorState.stringIndex}
          options={selectorState.options}
          onSelect={handleSelectorSelect}
          onClose={handleSelectorClose}
        />
      )}
    </Container>
  );
}