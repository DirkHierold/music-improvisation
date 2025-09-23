import styled from 'styled-components';
import { useStore } from '../store';
import { NoteDuration } from '../types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
  background-color: #3c3c3c;
  border-radius: 5px;
`;

const Title = styled.div`
  font-size: 12px;
  color: #888;
  margin-bottom: 5px;
`;

const DurationButton = styled.button<{ $selected: boolean }>`
  background-color: ${props => props.$selected ? '#5dade2' : '#3c3c3c'};
  border: 1px solid #555;
  border-radius: 3px;
  color: #d3d3d3;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;

  &:hover {
    background-color: ${props => props.$selected ? '#3498db' : '#4a4a4a'};
  }
`;

const durations: { value: NoteDuration; label: string }[] = [
  { value: 0.25, label: '1/4' },
  { value: 0.5, label: '1/2' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 4, label: '4' },
];

export function DurationPanel() {
  const { selectedDuration, setSelectedDuration, selectedNoteId, updateNote, song, setCursorPosition } = useStore();

  const handleDurationClick = (duration: NoteDuration) => {
    setSelectedDuration(duration);

    if (selectedNoteId) {
      const note = song.notes.find(n => n.id === selectedNoteId);
      if (!note) return;

      const oldEndTime = note.startTime + note.duration;
      const newEndTime = note.startTime + duration;

      if (newEndTime > oldEndTime) {
        const overlappingNotes = song.notes.filter(
          n => n.id !== selectedNoteId && n.pitch === note.pitch && n.startTime >= oldEndTime && n.startTime < newEndTime
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

      updateNote(selectedNoteId, { duration });
      setCursorPosition(note.startTime + duration);
    }
  };

  return (
    <Container>
      <Title>Duration</Title>
      {durations.map(({ value, label }) => (
        <DurationButton
          key={value}
          $selected={selectedDuration === value}
          onClick={() => handleDurationClick(value)}
        >
          {label}
        </DurationButton>
      ))}
    </Container>
  );
}