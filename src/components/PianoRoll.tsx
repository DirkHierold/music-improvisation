import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useStore } from '../store';
import { MAJOR_SCALES, CHROMATIC_NOTES, NOTE_COLORS, NoteDuration } from '../types';
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
`;

const Row = styled.div`
  display: flex;
  height: 40px;
  border-bottom: 1px solid #3c3c3c;
  position: relative;
`;

const NoteLabel = styled.div`
  width: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #333;
  border-right: 1px solid #3c3c3c;
  font-size: 12px;
  color: #888;
`;

const Timeline = styled.div`
  flex: 1;
  position: relative;
  display: flex;
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

export function PianoRoll() {
  const { song, isChromatic, selectedDuration, currentBeat, cursorPosition, isPlaying, addNote, updateNote, deleteNote, selectedNoteId, setSelectedNoteId, setSelectedDuration, setCursorPosition } = useStore();
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [resizingNote, setResizingNote] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, startTime: 0, pitch: '' });
  const containerRef = useRef<HTMLDivElement>(null);

  const notes = isChromatic
    ? CHROMATIC_NOTES.map(n => `${n}4`)
    : (MAJOR_SCALES[song.key] || MAJOR_SCALES['C Major']).map(n => `${n}4`);

  const reversedNotes = [...notes].reverse();
  const beatCount = 16;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNoteId) {
        e.preventDefault();
        deleteNote(selectedNoteId);
        setSelectedNoteId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteId, deleteNote, setSelectedNoteId]);

  const handleBeatLineClick = (e: React.MouseEvent, beat: number) => {
    e.stopPropagation();
    setCursorPosition(beat);
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
    setSelectedDuration(note.duration as NoteDuration);
    setDraggedNote(noteId);
    setDragStart({ x: e.clientX, y: e.clientY, startTime: note.startTime, pitch: note.pitch });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    setResizingNote(noteId);
    setDragStart({ x: e.clientX, y: 0, startTime: 0, pitch: '' });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (draggedNote) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const beatWidth = 60;
      const rowHeight = 40;

      const beatDelta = Math.round(deltaX / beatWidth);
      const pitchDelta = -Math.round(deltaY / rowHeight);

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
    if (draggedNote) {
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
  };

  useEffect(() => {
    if (draggedNote || resizingNote) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedNote, resizingNote, dragStart, song.notes]);

  const displayPosition = isPlaying ? currentBeat : cursorPosition;

  return (
    <Container ref={containerRef}>
      <Grid>
        <PlaybackCursor $position={50 + displayPosition * 60} />
        {reversedNotes.map((pitch) => (
          <Row key={pitch}>
            <NoteLabel>{pitch}</NoteLabel>
            <Timeline>
              {Array.from({ length: beatCount }).map((_, beatIndex) => (
                <Beat
                  key={beatIndex}
                  $isMeasureStart={beatIndex % song.meter.beatsPerMeasure === 0}
                  onClick={() => handleCellClick(pitch, beatIndex)}
                >
                  <BeatClickArea onClick={(e) => handleBeatLineClick(e, beatIndex)} />
                </Beat>
              ))}
              {song.notes
                .filter(note => note.pitch === pitch)
                .map(note => {
                  const noteName = note.pitch.replace(/\d+/, '');
                  const color = NOTE_COLORS[noteName.replace('#', '').replace('b', '')] || '#888';
                  const isNoteCurrentlyPlaying = isPlaying &&
                    currentBeat >= note.startTime &&
                    currentBeat < note.startTime + note.duration;
                  return (
                    <NoteBlock
                      key={note.id}
                      $color={color}
                      $selected={selectedNoteId === note.id}
                      $isPlaying={isNoteCurrentlyPlaying}
                      style={{
                        left: `${note.startTime * 60 + 1}px`,
                        width: `${note.duration * 60 - 2}px`,
                      }}
                      onMouseDown={(e) => handleNoteMouseDown(e, note.id)}
                    >
                      {noteName}
                      <ResizeHandle onMouseDown={(e) => handleResizeMouseDown(e, note.id)} />
                    </NoteBlock>
                  );
                })}
            </Timeline>
          </Row>
        ))}
      </Grid>
    </Container>
  );
}