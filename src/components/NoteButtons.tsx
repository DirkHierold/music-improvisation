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
  const { song, isChromatic, setIsChromatic, selectedDuration, currentBeat, isPlaying, addNote } = useStore();

  const notes = isChromatic
    ? CHROMATIC_NOTES
    : MAJOR_SCALES[song.key] || MAJOR_SCALES['C Major'];

  const handleNoteClick = async (noteName: string) => {
    await audioEngine.initialize();
    const pitch = `${noteName}4`;
    audioEngine.playNote(pitch, selectedDuration);

    const insertPosition = isPlaying ? currentBeat : findNextInsertPosition();

    addNote({
      pitch,
      startTime: insertPosition,
      duration: selectedDuration,
    });
  };

  const findNextInsertPosition = () => {
    if (song.notes.length === 0) return 0;

    const lastNote = song.notes.reduce((latest, note) => {
      const noteEnd = note.startTime + note.duration;
      const latestEnd = latest.startTime + latest.duration;
      return noteEnd > latestEnd ? note : latest;
    });

    return lastNote.startTime + lastNote.duration;
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