import { useState } from 'react';
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

const DurationButton = styled.button<{ $selected: boolean; $disabled?: boolean }>`
  background-color: ${props => props.$disabled ? '#2a2a2a' : props.$selected ? '#5dade2' : '#3c3c3c'};
  border: 1px solid #555;
  border-radius: 3px;
  color: ${props => props.$disabled ? '#555' : '#d3d3d3'};
  padding: 8px 12px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: background-color 0.2s;
  font-size: 14px;
  opacity: ${props => props.$disabled ? 0.5 : 1};

  &:hover {
    background-color: ${props => props.$disabled ? '#2a2a2a' : props.$selected ? '#3498db' : '#4a4a4a'};
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

  // Calculate maximum available duration for the selected note
  const getMaxAvailableDuration = (): number | null => {
    if (!selectedNoteId) return null;

    const note = song.notes.find(n => n.id === selectedNoteId);
    if (!note) return null;

    const nextNoteOnSameRow = song.notes
      .filter(n => n.id !== selectedNoteId && n.pitch === note.pitch && n.startTime > note.startTime)
      .sort((a, b) => a.startTime - b.startTime)[0];

    return nextNoteOnSameRow
      ? nextNoteOnSameRow.startTime - note.startTime
      : null; // No limit if no next note
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

    setSelectedComponents(newComponents);

    // Calculate total duration
    const totalDuration = newComponents.reduce((sum, d) => sum + d, 0);

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

      const finalDuration = Math.min(totalDuration, maxDuration) as NoteDuration;

      updateNote(selectedNoteId, { duration: finalDuration });
      setCursorPosition(note.startTime + finalDuration);
    }
  };

  const totalDuration = selectedComponents.reduce((sum, d) => sum + d, 0);
  const maxAvailableDuration = getMaxAvailableDuration();

  // Function to check if adding a duration would exceed the limit
  const isDurationDisabled = (duration: NoteDuration): boolean => {
    if (maxAvailableDuration === null) return false; // No limit

    // If already selected, never disable (user can deselect)
    if (selectedComponents.includes(duration)) return false;

    // Calculate what the total would be if we add this duration
    const potentialTotal = totalDuration + duration;

    return potentialTotal > maxAvailableDuration;
  };

  return (
    <Container>
      <Title>Duration</Title>
      <TotalDisplay>{totalDuration} beats</TotalDisplay>
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
    </Container>
  );
}