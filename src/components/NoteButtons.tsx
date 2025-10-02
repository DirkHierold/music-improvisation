import styled from 'styled-components';
import { useStore } from '../store';
import { MAJOR_SCALES, CHROMATIC_NOTES, NOTE_COLORS } from '../types';
import { audioEngine } from '../services/AudioEngine';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  flex-wrap: wrap;
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

  &:hover {
    opacity: 0.8;
  }
`;

export function NoteButtons() {
  const { song, isChromatic, setIsChromatic, selectedDuration, cursorPosition, currentBeat, isPlaying, addNote } = useStore();

  const notes = isChromatic
    ? CHROMATIC_NOTES
    : MAJOR_SCALES[song.key] || MAJOR_SCALES['C Major'];

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
    });
  };

  return (
    <Container>
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
    </Container>
  );
}