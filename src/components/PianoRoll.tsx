import { useState, useRef, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useStore } from '../store';
import { MAJOR_SCALES, CHROMATIC_NOTES, NOTE_COLORS, NoteDuration, getChordInfo } from '../types';
import { audioEngine } from '../services/AudioEngine';

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

const Beat = styled.div<{ $isMeasureStart: boolean }>`
  width: 60px;
  border-left: 1px solid ${props => props.$isMeasureStart ? '#555' : 'transparent'};
  border-right: 1px solid #3a3a3a;
  flex-shrink: 0;
  position: relative;
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

export function PianoRoll() {
  const { song, isChromatic, selectedDuration, currentBeat, cursorPosition, isPlaying, addNote, updateNote, deleteNote, selectedNoteId, setSelectedNoteId, setSelectedDuration, setCursorPosition, selectedChordId, setSelectedChordId, updateChord, deleteChord } = useStore();

  // Extract key explicitly for better React dependency tracking
  const currentKey = song.key;
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [resizingNote, setResizingNote] = useState<string | null>(null);
  const [draggedChord, setDraggedChord] = useState<string | null>(null);
  const [resizingChord, setResizingChord] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, startTime: 0, pitch: '' });
  const containerRef = useRef<HTMLDivElement>(null);

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
            const chordsToUpdate = song.chords.filter(c => c.startTime > chord.startTime);
            chordsToUpdate.forEach(c => {
              updateChord(c.id, { startTime: c.startTime + timeDelta });
            });

            updateChord(selectedChordId, { startTime: newStartTime });
            setCursorPosition(newStartTime + chord.duration);
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

        let newPitch: string;
        if (e.key === 'ArrowUp') {
          if (noteIndex === pitchOrder.length - 1) {
            newPitch = pitchOrder[0] + (octave + 1);
          } else {
            newPitch = pitchOrder[noteIndex + 1] + octave;
          }
        } else {
          if (noteIndex === 0) {
            newPitch = pitchOrder[pitchOrder.length - 1] + (octave - 1);
          } else {
            newPitch = pitchOrder[noteIndex - 1] + octave;
          }
        }

        updateNote(selectedNoteId, { pitch: newPitch });
        audioEngine.playNote(newPitch, note.duration);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const note = song.notes.find(n => n.id === selectedNoteId);
        if (!note) return;

        const timeDelta = e.key === 'ArrowLeft' ? -0.25 : 0.25;
        const newStartTime = Math.max(0, note.startTime + timeDelta);

        if (newStartTime !== note.startTime) {
          const notesToUpdate = song.notes.filter(n => n.startTime > note.startTime);
          notesToUpdate.forEach(n => {
            updateNote(n.id, { startTime: n.startTime + timeDelta });
          });

          updateNote(selectedNoteId, { startTime: newStartTime });
          setCursorPosition(newStartTime + note.duration);
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

  const handleCellClick = async (pitch: string, beat: number) => {
    const existingNote = song.notes.find(
      n => n.pitch === pitch && beat >= n.startTime && beat < n.startTime + n.duration
    );

    if (!existingNote) {
      await audioEngine.initialize();
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

      addNote({
        pitch,
        startTime: beat,
        duration: selectedDuration,
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
      const beatDelta = Math.round(deltaX / beatWidth);

      const chord = song.chords.find(c => c.id === draggedChord);
      if (!chord) return;

      const newStartTime = Math.max(0, dragStart.startTime + beatDelta);

      if (newStartTime !== chord.startTime) {
        const timeDelta = newStartTime - dragStart.startTime;

        const chordsToUpdate = song.chords.filter(c => c.startTime > dragStart.startTime);
        chordsToUpdate.forEach(c => {
          updateChord(c.id, { startTime: c.startTime + timeDelta });
        });

        updateChord(draggedChord, { startTime: newStartTime });
      }
    } else if (resizingChord) {
      const deltaX = e.clientX - dragStart.x;
      const beatWidth = 60;
      const beatDelta = Math.round(deltaX / beatWidth);

      const chord = song.chords.find(c => c.id === resizingChord);
      if (!chord) return;

      const newDuration = Math.max(0.25, chord.duration + beatDelta * 0.25);
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

        updateChord(resizingChord, { duration: newDuration });
        setDragStart({ ...dragStart, x: e.clientX });
      }
    } else if (draggedNote) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const beatWidth = 60;
      const rowHeight = 40;

      const beatDelta = Math.round(deltaX / beatWidth);
      const pitchDelta = Math.round(deltaY / rowHeight);

      const note = song.notes.find(n => n.id === draggedNote);
      if (!note) return;

      const newStartTime = Math.max(0, dragStart.startTime + beatDelta);
      const currentPitchIndex = reversedNotes.indexOf(dragStart.pitch);
      const newPitchIndex = Math.max(0, Math.min(reversedNotes.length - 1, currentPitchIndex + pitchDelta));
      const newPitch = reversedNotes[newPitchIndex];

      if (newStartTime !== note.startTime || newPitch !== note.pitch) {
        const timeDelta = newStartTime - dragStart.startTime;

        const notesToUpdate = song.notes.filter(n => n.startTime > dragStart.startTime);
        notesToUpdate.forEach(n => {
          updateNote(n.id, { startTime: n.startTime + timeDelta });
        });

        updateNote(draggedNote, { startTime: newStartTime, pitch: newPitch });
        audioEngine.playNote(newPitch, note.duration);
      }
    } else if (resizingNote) {
      const deltaX = e.clientX - dragStart.x;
      const beatWidth = 60;
      const beatDelta = Math.round(deltaX / beatWidth);

      const note = song.notes.find(n => n.id === resizingNote);
      if (!note) return;

      const newDuration = Math.max(0.25, note.duration + beatDelta * 0.25);
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

        updateNote(resizingNote, { duration: newDuration });
        setDragStart({ ...dragStart, x: e.clientX });
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
                    return (
                      <Beat
                        key={beatIndex}
                        $isMeasureStart={absoluteBeat % song.meter.beatsPerMeasure === 0}
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
          </Grid>
        );
      })}
    </Container>
  );
}