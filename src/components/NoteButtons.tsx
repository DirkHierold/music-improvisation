import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useStore } from '../store';
import { MAJOR_SCALES, CHROMATIC_NOTES, NOTE_COLORS, NoteDuration, getChordInfo, durationToComponents } from '../types';
import { audioEngine } from '../services/AudioEngine';

const Container = styled.div`
  display: flex;
  gap: 20px;
  align-items: flex-end;
`;

const NotesSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
`;

const DurationSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DurationButtonsRow = styled.div`
  display: flex;
  gap: 5px;
`;

const ChordSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
`;

const ChordButtonsRow = styled.div`
  display: flex;
  gap: 5px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
`;

const Title = styled.div`
  font-size: 12px;
  color: #888;
`;

const ChromaticToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  cursor: pointer;
`;

const ToggleSwitch = styled.input`
  appearance: none;
  width: 40px;
  height: 20px;
  background-color: #3c3c3c;
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s;

  &:checked {
    background-color: #5dade2;
  }

  &::before {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: #d3d3d3;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
  }

  &:checked::before {
    transform: translateX(20px);
  }
`;

const ButtonsRow = styled.div`
  display: flex;
  gap: 5px;
`;

const NoteButton = styled.button<{ $color: string }>`
  background-color: ${props => props.$color};
  border: none;
  border-radius: 5px;
  color: white;
  padding: 10px 15px;
  cursor: pointer;
  font-weight: bold;
  transition: opacity 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 60px;
  min-height: 60px;

  &:hover {
    opacity: 0.8;
  }
`;

const DurationButton = styled.button<{ $selected: boolean; $disabled?: boolean }>`
  background-color: ${props => props.$disabled ? '#2a2a2a' : props.$selected ? '#5dade2' : '#3c3c3c'};
  border: none;
  border-radius: 5px;
  color: ${props => props.$disabled ? '#555' : 'white'};
  padding: 10px 15px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: opacity 0.2s, background-color 0.2s;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 60px;
  min-height: 60px;
  opacity: ${props => props.$disabled ? 0.5 : 1};

  &:hover {
    opacity: ${props => props.$disabled ? 0.5 : 0.8};
    background-color: ${props => props.$disabled ? '#2a2a2a' : props.$selected ? '#3498db' : '#4a4a4a'};
  }
`;

const ChordButton = styled.button<{ $color: string }>`
  background-color: ${props => props.$color};
  border: none;
  border-radius: 5px;
  color: white;
  padding: 10px 15px;
  cursor: pointer;
  font-weight: bold;
  transition: opacity 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 60px;
  min-height: 60px;

  &:hover {
    opacity: 0.8;
  }
`;

const ChordName = styled.div`
  font-size: 10px;
  opacity: 0.8;
`;

const ChordRoman = styled.div`
  font-size: 14px;
`;

const durations: { value: NoteDuration; label: string }[] = [
  { value: 0.25, label: '1/4' },
  { value: 0.5, label: '1/2' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 4, label: '4' },
];

const chords: ('I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII')[] = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export function NoteButtons() {
  const { song, isChromatic, setIsChromatic, selectedDuration, setSelectedDuration, selectedNoteId, selectedChordId, updateNote, updateChord, setCursorPosition, cursorPosition, currentBeat, isPlaying, addNote, addChord } = useStore();
  const [selectedComponents, setSelectedComponents] = useState<NoteDuration[]>([1]); // Start with 1 beat selected

  const notes = isChromatic
    ? CHROMATIC_NOTES
    : MAJOR_SCALES[song.key] || MAJOR_SCALES['C Major'];

  // Sync selectedComponents when a note or chord is selected
  useEffect(() => {
    if (selectedNoteId) {
      const note = song.notes.find(n => n.id === selectedNoteId);
      if (note) {
        // Use stored durationComponents or calculate from duration
        const components = note.durationComponents || durationToComponents(note.duration);
        setSelectedComponents(components);
        setSelectedDuration(note.duration);
      }
    } else if (selectedChordId) {
      const chord = song.chords.find(c => c.id === selectedChordId);
      if (chord) {
        // Use stored durationComponents or calculate from duration
        const components = chord.durationComponents || durationToComponents(chord.duration);
        setSelectedComponents(components);
        setSelectedDuration(chord.duration);
      }
    }
  }, [selectedNoteId, selectedChordId, song.notes, song.chords]);

  const handleNoteClick = async (noteName: string) => {
    await audioEngine.initialize();

    // Calculate the correct octave based on the current key
    const getCorrectOctave = (noteName: string, key: string): number => {
      const scaleNotes = MAJOR_SCALES[key] || MAJOR_SCALES['C Major'];
      const rootNote = scaleNotes[0];

      const pitchOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const rootIndex = pitchOrder.indexOf(rootNote.replace('b', '#'));
      const noteIndex = pitchOrder.indexOf(noteName.replace('b', '#'));

      // Base octave is 4 for all keys
      const baseOctave = 4;

      // If the note comes before the root note in chromatic order, it's in the next octave
      return noteIndex < rootIndex ? baseOctave + 1 : baseOctave;
    };

    const correctOctave = getCorrectOctave(noteName, song.key);
    const pitch = `${noteName}${correctOctave}`;

    audioEngine.playNote(pitch, selectedDuration);

    const insertPosition = isPlaying ? currentBeat : cursorPosition;

    const overlappingNotes = song.notes.filter(
      n => n.pitch === pitch && n.startTime >= insertPosition && n.startTime < insertPosition + selectedDuration
    );

    if (overlappingNotes.length > 0) {
      const pushAmount = (insertPosition + selectedDuration) - overlappingNotes[0].startTime;
      song.notes
        .filter(n => n.startTime >= overlappingNotes[0].startTime)
        .forEach(n => {
          const { updateNote } = useStore.getState();
          updateNote(n.id, { startTime: n.startTime + pushAmount });
        });
    }

    addNote({
      pitch,
      startTime: insertPosition,
      duration: selectedDuration,
      durationComponents: selectedComponents,
    });
  };

  const handleChordClick = async (roman: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII') => {
    await audioEngine.initialize();

    // Play chord preview
    audioEngine.playChord(roman, song.key, selectedDuration);

    const insertPosition = isPlaying ? currentBeat : cursorPosition;

    const overlappingChords = song.chords.filter(
      c => c.startTime >= insertPosition && c.startTime < insertPosition + selectedDuration
    );

    if (overlappingChords.length > 0) {
      const pushAmount = (insertPosition + selectedDuration) - overlappingChords[0].startTime;
      song.chords
        .filter(c => c.startTime >= overlappingChords[0].startTime)
        .forEach(c => {
          const { updateChord } = useStore.getState();
          updateChord(c.id, { startTime: c.startTime + pushAmount });
        });
    }

    addChord({
      roman,
      startTime: insertPosition,
      duration: selectedDuration,
      durationComponents: selectedComponents,
    });
  };

  // Calculate maximum available duration for the selected note or chord
  const getMaxAvailableDuration = (): number | null => {
    if (selectedNoteId) {
      const note = song.notes.find(n => n.id === selectedNoteId);
      if (!note) return null;

      const nextNoteOnSameRow = song.notes
        .filter(n => n.id !== selectedNoteId && n.pitch === note.pitch && n.startTime > note.startTime)
        .sort((a, b) => a.startTime - b.startTime)[0];

      return nextNoteOnSameRow
        ? nextNoteOnSameRow.startTime - note.startTime
        : null; // No limit if no next note
    } else if (selectedChordId) {
      const chord = song.chords.find(c => c.id === selectedChordId);
      if (!chord) return null;

      const nextChordOnSameRow = song.chords
        .filter(c => c.id !== selectedChordId && c.startTime > chord.startTime)
        .sort((a, b) => a.startTime - b.startTime)[0];

      return nextChordOnSameRow
        ? nextChordOnSameRow.startTime - chord.startTime
        : null; // No limit if no next chord
    }
    return null;
  };

  // Function to check if adding a duration would exceed the limit
  const isDurationDisabled = (duration: NoteDuration): boolean => {
    const maxAvailableDuration = getMaxAvailableDuration();

    // If no note or chord selected, or no limit, don't disable
    if (maxAvailableDuration === null) {
      // Still enforce max duration of 7.75 beats (sum of all available durations)
      const MAX_DURATION = 7.75;
      const totalDuration = selectedComponents.reduce((sum, d) => sum + d, 0);
      if (selectedComponents.includes(duration)) return false;
      return (totalDuration + duration) > MAX_DURATION;
    }

    // If already selected, never disable (user can deselect)
    if (selectedComponents.includes(duration)) return false;

    // Calculate what the total would be if we add this duration
    const totalDuration = selectedComponents.reduce((sum, d) => sum + d, 0);
    const potentialTotal = totalDuration + duration;

    return potentialTotal > maxAvailableDuration;
  };

  const handleDurationClick = (duration: NoteDuration) => {
    let newComponents: NoteDuration[];

    if (selectedComponents.includes(duration)) {
      // Trying to remove this duration
      // Only allow if there's more than one component selected
      if (selectedComponents.length > 1) {
        newComponents = selectedComponents.filter(d => d !== duration);
      } else {
        // Can't remove the last duration - do nothing
        return;
      }
    } else {
      // Adding this duration
      newComponents = [...selectedComponents, duration].sort((a, b) => b - a); // Sort descending
    }

    // Calculate total duration
    const totalDuration = newComponents.reduce((sum, d) => sum + d, 0);

    // Enforce max duration of 7.75 beats (sum of all available durations)
    const MAX_DURATION = 7.75;
    if (totalDuration > MAX_DURATION) {
      return; // Don't allow exceeding max duration
    }

    setSelectedComponents(newComponents);
    setSelectedDuration(totalDuration as NoteDuration);

    if (selectedNoteId) {
      const note = song.notes.find(n => n.id === selectedNoteId);
      if (!note) return;

      // Find the next note on the same row (same pitch)
      const nextNoteOnSameRow = song.notes
        .filter(n => n.id !== selectedNoteId && n.pitch === note.pitch && n.startTime > note.startTime)
        .sort((a, b) => a.startTime - b.startTime)[0];

      // Limit duration to not exceed the next note's start time
      const maxDuration = nextNoteOnSameRow
        ? nextNoteOnSameRow.startTime - note.startTime
        : totalDuration;

      const finalDuration = Math.min(totalDuration, maxDuration);

      updateNote(selectedNoteId, { duration: finalDuration, durationComponents: newComponents });
      setCursorPosition(note.startTime + finalDuration);
    } else if (selectedChordId) {
      const chord = song.chords.find(c => c.id === selectedChordId);
      if (!chord) return;

      // Find the next chord on the same row (chord row)
      const nextChordOnSameRow = song.chords
        .filter(c => c.id !== selectedChordId && c.startTime > chord.startTime)
        .sort((a, b) => a.startTime - b.startTime)[0];

      // Limit duration to not exceed the next chord's start time
      const maxDuration = nextChordOnSameRow
        ? nextChordOnSameRow.startTime - chord.startTime
        : totalDuration;

      const finalDuration = Math.min(totalDuration, maxDuration);

      updateChord(selectedChordId, { duration: finalDuration, durationComponents: newComponents });
      setCursorPosition(chord.startTime + finalDuration);
    }
  };

  return (
    <Container>
      <NotesSection>
        <Header>
          <Title>Notes in {song.key}</Title>
          <ChromaticToggle>
            <span>Chromatic</span>
            <ToggleSwitch
              type="checkbox"
              checked={isChromatic}
              onChange={(e) => setIsChromatic(e.target.checked)}
            />
          </ChromaticToggle>
        </Header>
        <ButtonsRow>
          {notes.map((note) => (
            <NoteButton
              key={note}
              $color={NOTE_COLORS[note.replace('#', '').replace('b', '')] || '#888'}
              onClick={() => handleNoteClick(note)}
            >
              {note}
            </NoteButton>
          ))}
        </ButtonsRow>
      </NotesSection>
      <ChordSection>
        <Header>
          <Title>Chords in {song.key}</Title>
        </Header>
        <ChordButtonsRow>
          {chords.map((roman) => {
            const chordInfo = getChordInfo(roman, song.key);
            const qualitySuffix = chordInfo.quality === 'minor' ? 'm' : chordInfo.quality === 'diminished' ? '°' : '';
            return (
              <ChordButton
                key={roman}
                $color={chordInfo.color}
                onClick={() => handleChordClick(roman)}
              >
                <ChordRoman>{roman}</ChordRoman>
                <ChordName>{chordInfo.name}{qualitySuffix}</ChordName>
              </ChordButton>
            );
          })}
        </ChordButtonsRow>
      </ChordSection>
      <DurationSection>
        <Title>Duration ({selectedComponents.reduce((sum, d) => sum + d, 0)} beats)</Title>
        <DurationButtonsRow>
          {durations.map(({ value, label }) => (
            <DurationButton
              key={value}
              $selected={selectedComponents.includes(value)}
              $disabled={isDurationDisabled(value)}
              onClick={() => !isDurationDisabled(value) && handleDurationClick(value)}
            >
              {label}
            </DurationButton>
          ))}
        </DurationButtonsRow>
      </DurationSection>
    </Container>
  );
}