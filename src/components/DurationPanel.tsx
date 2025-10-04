import { useState, useEffect } from 'react';
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

const TotalDisplay = styled.div`
  font-size: 14px;
  color: #5dade2;
  font-weight: bold;
  padding: 5px;
  text-align: center;
  background-color: #2c2c2c;
  border-radius: 3px;
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
  const { setSelectedDuration, selectedNoteId, updateNote, song, setCursorPosition } = useStore();
  const [selectedComponents, setSelectedComponents] = useState<NoteDuration[]>([1]); // Start with 1 beat selected

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

    setSelectedComponents(newComponents);

    // Calculate total duration
    const totalDuration = newComponents.reduce((sum, d) => sum + d, 0);

    setSelectedDuration(totalDuration as NoteDuration);

    if (selectedNoteId) {
      const note = song.notes.find(n => n.id === selectedNoteId);
      if (!note) return;

      const oldEndTime = note.startTime + note.duration;
      const newEndTime = note.startTime + totalDuration;

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

      updateNote(selectedNoteId, { duration: totalDuration as NoteDuration });
      setCursorPosition(note.startTime + totalDuration);
    }
  };

  const totalDuration = selectedComponents.reduce((sum, d) => sum + d, 0);

  return (
    <Container>
      <Title>Duration</Title>
      <TotalDisplay>{totalDuration} beats</TotalDisplay>
      {durations.map(({ value, label }) => (
        <DurationButton
          key={value}
          $selected={selectedComponents.includes(value)}
          onClick={() => handleDurationClick(value)}
        >
          {label}
        </DurationButton>
      ))}
    </Container>
  );
}