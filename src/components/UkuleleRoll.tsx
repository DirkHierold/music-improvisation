import { useEffect, useRef, useState, useMemo } from 'react';
import styled from 'styled-components';
import { useStore } from '../store';
import { NOTE_COLORS } from '../types';
import { audioEngine } from '../services/AudioEngine';
import * as Tone from 'tone';
import { calculateUkuleleNotes } from './PianoRoll';

const Container = styled.div<{ $isDragging: boolean }>`
  flex: 1;
  background-color: #2a2a2a;
  border-radius: 5px;
  overflow: hidden;
  position: relative;
  height: 300px;
  cursor: ${props => props.$isDragging ? 'grabbing' : 'grab'};
`;

const UkuleleFretboard = styled.div`
  height: 100%;
  position: relative;
  background-color: #3a2a1a;
`;

const String = styled.div<{ $stringIndex: number }>`
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background-color: #C0C0C0;
  top: ${props => 60 + props.$stringIndex * 60}px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  z-index: 1;
`;

const NoteElement = styled.div.attrs<{
  $x: number;
  $y: number;
  $width: number;
  $color: string;
}>(props => ({
  style: {
    left: `${props.$x}px`,
    top: `${props.$y}px`,
    width: `${props.$width}px`,
    backgroundColor: props.$color,
  },
}))`
  position: absolute;
  height: 40px;
  border-radius: 20px;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 10;
  transition: left 0.08s linear;
`;


const TriggerLine = styled.div`
  position: absolute;
  left: 30px;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #ff4444;
  z-index: 20;
  box-shadow: 0 0 4px rgba(255, 68, 68, 0.5);
  pointer-events: none;
`;

const BeatLine = styled.div.attrs<{ $x: number }>(props => ({
  style: {
    left: `${props.$x}px`,
  },
}))`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: #3a3a3a;
  z-index: 5;
  transition: left 0.08s linear;
`;

const MeasureLine = styled.div.attrs<{ $x: number }>(props => ({
  style: {
    left: `${props.$x}px`,
  },
}))`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: #555;
  z-index: 6;
  transition: left 0.08s linear;
`;

const UKULELE_TUNING = ['A4', 'E4', 'C4', 'G4'];
const STRING_POSITIONS = [60, 120, 180, 240];

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

export function UkuleleRoll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const playedNotes = useRef<Set<string>>(new Set());
  const lastBeat = useRef<number>(0);
  const currentBeatRef = useRef<number>(0); // Fix closure issue!
  const [containerWidth, setContainerWidth] = useState(800);
  const [isDragging, setIsDragging] = useState(false);
  const [hasBeenScrubbed, setHasBeenScrubbed] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartBeat = useRef<number>(0);

  const { song, currentBeat, isPlaying, setIsPlaying, setCurrentBeat, setCursorPosition } = useStore();

  // Calculate ukulele notes (includes both chord positions and melody notes)
  const ukuleleNotes = useMemo(() => {
    const notes = calculateUkuleleNotes(song.notes, song.chords, song.key);
    return notes.map((n, idx) => ({
      id: `ukulele-${n.startTime}-${n.pitch}-${idx}`,
      pitch: n.pitch,
      startTime: n.startTime,
      duration: n.duration,
      stringIndex: n.stringIndex
    }));
  }, [song.notes, song.chords, song.key]);

  // Update container width when component mounts or resizes
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Keep ref in sync with store value
  currentBeatRef.current = currentBeat;

  // Track beat changes
  if (currentBeat !== lastBeat.current && Math.abs(currentBeat - lastBeat.current) > 0.1) {
    lastBeat.current = currentBeat;
  }

  useEffect(() => {
    const animate = () => {
      if (isPlaying) {
        checkForNotesToPlay();
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    const checkForNotesToPlay = async () => {
    if (!containerRef.current || !isPlaying) return;

    const latestBeat = currentBeatRef.current; // Use ref for latest value!
    const containerWidth = containerRef.current.clientWidth || 800;

    // Check for audio engine issues
    if (latestBeat === 0 && performance.now() - startTimeRef.current > 2000) {
      return; // AudioEngine problem
    }

    const pixelsPerBeat = 60; // Match PianoRoll spacing

    // Check each note for triggering
    for (const note of ukuleleNotes) {
      const noteId = note.id;

      // Trigger logic: trigger when note reaches trigger line after traveling from right
      const travelTimeBeats = (containerWidth - 30) / pixelsPerBeat; // Time to travel from right edge to trigger
      const actualTriggerTime = note.startTime + travelTimeBeats; // When note should actually be triggered
      const isTimeToTrigger = latestBeat >= actualTriggerTime - 0.1 && latestBeat <= actualTriggerTime + 0.1;
      const shouldTrigger = isTimeToTrigger && !playedNotes.current.has(noteId);

      if (shouldTrigger) {
        playedNotes.current.add(noteId);

        try {
          await Tone.start();
          await audioEngine.initialize();

          const durationInSeconds = (note.duration * 60) / song.tempo;
          audioEngine.playNote(note.pitch, durationInSeconds);
        } catch (error) {
          // Audio error - continue silently
        }
      }
    }

    // Completion check - wait until all notes have been played AND last note has traveled off screen
    const totalNotes = ukuleleNotes.length;
    const playedCount = playedNotes.current.size;
    const lastNoteTime = ukuleleNotes.length > 0 ? Math.max(...ukuleleNotes.map(n => n.startTime)) : 0;
    const travelTimeBeats = (containerWidth - 30) / pixelsPerBeat;
    // Time for last note to travel from trigger line to completely off left side
    const timeToExitScreen = (30 + 50) / pixelsPerBeat; // From trigger (30px) to off-screen (-50px)

    // Last note is triggered at: lastNoteTime + travelTimeBeats
    // Last note exits screen at: lastNoteTime + travelTimeBeats + timeToExitScreen
    const lastNoteExitTime = lastNoteTime + travelTimeBeats + timeToExitScreen;
    const allNotesPlayedAndExited = playedCount >= totalNotes && latestBeat > lastNoteExitTime;

    if (allNotesPlayedAndExited && totalNotes > 0 && isPlaying) {
      audioEngine.stopPlayback();
      setIsPlaying(false);
      setCurrentBeat(0);

      // Calculate end position after the last note
      const endPosition = ukuleleNotes.length > 0
        ? Math.max(...ukuleleNotes.map(note => note.startTime + note.duration))
        : 0;
      setCursorPosition(endPosition);

      playedNotes.current.clear();
    }
    };

    if (isPlaying) {
      startTimeRef.current = performance.now();
      playedNotes.current.clear();
      setHasBeenScrubbed(false); // Reset scrub state when playing starts
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      playedNotes.current.clear();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, ukuleleNotes, song.tempo]);

  const pixelsPerBeat = 60; // Match PianoRoll spacing

  const renderBeatLines = () => {
    const latestBeat = (isPlaying || isDragging || hasBeenScrubbed) ? currentBeatRef.current : 0;
    const travelTimeBeats = (containerWidth - 30) / pixelsPerBeat;
    const lines = [];

    if (!isPlaying && !isDragging && !hasBeenScrubbed) {
      // When not playing and not dragging and not scrubbed, show static lines across the screen
      const beatsToShow = Math.ceil(containerWidth / pixelsPerBeat) + 2;

      for (let beat = 0; beat <= beatsToShow; beat++) {
        const beatX = beat * pixelsPerBeat;

        // Only show beat lines that are visible on screen
        if (beatX > containerWidth + 50) {
          continue;
        }

        // Check if this is a measure start (every 4 beats)
        const isMeasureStart = beat % 4 === 0;

        if (isMeasureStart) {
          lines.push(
            <MeasureLine key={`static-measure-${beat}`} $x={beatX} />
          );
        } else {
          lines.push(
            <BeatLine key={`static-beat-${beat}`} $x={beatX} />
          );
        }
      }
    } else {
      // When playing or dragging or scrubbed, show moving lines
      const startBeat = Math.floor(latestBeat - travelTimeBeats) - 5;
      const endBeat = Math.ceil(latestBeat + 5);

      for (let beat = startBeat; beat <= endBeat; beat++) {
        const actualTriggerTime = beat + travelTimeBeats;
        const timeDifference = latestBeat - actualTriggerTime;
        const beatX = 30 - (timeDifference * pixelsPerBeat);

        // Only show beat lines that are visible on screen
        if (beatX > containerWidth + 50 || beatX < -50) continue;

        // Check if this is a measure start (every 4 beats)
        const isMeasureStart = beat % 4 === 0;

        if (isMeasureStart) {
          lines.push(
            <MeasureLine key={`moving-measure-${beat}`} $x={beatX} />
          );
        } else {
          lines.push(
            <BeatLine key={`moving-beat-${beat}`} $x={beatX} />
          );
        }
      }
    }

    return lines;
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    e.preventDefault();

    // Pause playback immediately and stop audio engine
    if (isPlaying) {
      audioEngine.stopPlayback();
      setIsPlaying(false);
    }

    setIsDragging(true);
    setHasBeenScrubbed(true);
    dragStartX.current = e.clientX;
    dragStartBeat.current = currentBeat;
  };

  const handleContainerMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const deltaX = e.clientX - dragStartX.current;
    const pixelsPerBeat = 60;
    const beatDelta = -deltaX / pixelsPerBeat; // Negative because dragging right should go back in time

    const newBeat = Math.max(0, dragStartBeat.current + beatDelta);

    setCurrentBeat(newBeat);
    setCursorPosition(newBeat); // Update cursor position for playback continuation
    playedNotes.current.clear();
  };

  const handleContainerMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleContainerMouseMove);
      window.addEventListener('mouseup', handleContainerMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleContainerMouseMove);
        window.removeEventListener('mouseup', handleContainerMouseUp);
      };
    }
  }, [isDragging, currentBeat]);

  const renderNotes = () => {
    // Only show notes when playing, dragging, or has been scrubbed
    if (!isPlaying && !isDragging && !hasBeenScrubbed) {
      return [];
    }

    const latestBeat = currentBeatRef.current;

    return ukuleleNotes.map(note => {
      // Notes move at constant speed matching editor spacing
      // Note position based on time relative to when it should be triggered after traveling
      const travelTimeBeats = (containerWidth - 30) / pixelsPerBeat; // Time to travel from right edge to trigger
      const actualTriggerTime = note.startTime + travelTimeBeats; // When note should actually be triggered
      const timeDifference = latestBeat - actualTriggerTime; // negative = future, positive = past
      // Position: trigger line (30px) + time offset * pixels per beat
      const noteStartX = 30 - (timeDifference * pixelsPerBeat);

      // Use stringIndex from calculated ukulele notes if available
      let stringIndex = note.stringIndex;
      let fret = 0;

      if (stringIndex !== undefined) {
        // Calculate fret from pitch and string
        const stringNote = UKULELE_TUNING[stringIndex];
        const baseNote = stringNote.slice(0, -1);
        const octave = parseInt(stringNote.slice(-1));
        const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const baseIndex = chromatic.indexOf(baseNote);

        const targetNote = note.pitch.slice(0, -1);
        const targetOctave = parseInt(note.pitch.slice(-1));
        const targetIndex = chromatic.indexOf(targetNote);

        const semitoneDiff = (targetOctave - octave) * 12 + (targetIndex - baseIndex);
        fret = semitoneDiff;
      } else {
        // Fallback to findBestFretPosition
        const position = findBestFretPosition(note.pitch);
        if (!position) return null;
        stringIndex = position.string;
        fret = position.fret;
      }

      const noteWidth = note.duration * pixelsPerBeat;

      // Only show notes when they should be visible
      // Calculate when note should first appear at right edge
      const timeWhenNoteAppearsAtRightEdge = note.startTime; // Note appears at its startTime at right edge

      // Only show note if:
      // 1. Current time is past when note should appear at right edge
      // 2. Note hasn't completely exited left side
      if (latestBeat < timeWhenNoteAppearsAtRightEdge || noteStartX + noteWidth < -50) {
        return null;
      }
      const noteY = STRING_POSITIONS[stringIndex] - 20;
      const noteColor = NOTE_COLORS[note.pitch.slice(0, -1)] || '#666';

      return (
        <NoteElement
          key={note.id}
          $x={noteStartX}
          $y={noteY}
          $width={noteWidth}
          $color={noteColor}
        >
          {fret === 0 ? 'O' : fret}
        </NoteElement>
      );
    }).filter(Boolean);
  };

  return (
    <Container
      ref={containerRef}
      $isDragging={isDragging}
      onMouseDown={handleContainerMouseDown}
    >
      <UkuleleFretboard>
        {UKULELE_TUNING.map((_, index) => (
          <String key={index} $stringIndex={index} />
        ))}
        <TriggerLine />
        {renderBeatLines()}
        {renderNotes()}
      </UkuleleFretboard>
    </Container>
  );
}