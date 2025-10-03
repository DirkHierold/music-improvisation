import styled from 'styled-components';
import { useStore } from '../store';
import { audioEngine } from '../services/AudioEngine';

const Container = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const ControlButton = styled.button`
  background-color: #3c3c3c;
  border: 1px solid #555;
  border-radius: 5px;
  color: #d3d3d3;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: #4a4a4a;
  }
`;

const PlayButton = styled(ControlButton)<{ $isPlaying: boolean }>`
  background-color: ${props => props.$isPlaying ? '#c0392b' : '#e67e22'};

  &:hover {
    background-color: ${props => props.$isPlaying ? '#a93226' : '#f39c12'};
  }
`;

const ToggleButton = styled(ControlButton)<{ $isActive: boolean }>`
  background-color: ${props => props.$isActive ? '#27ae60' : '#3c3c3c'};

  &:hover {
    background-color: ${props => props.$isActive ? '#2ecc71' : '#4a4a4a'};
  }
`;

export function TransportControls() {
  const { isPlaying, setIsPlaying, setCurrentBeat, setCursorPosition, cursorPosition, song, isPracticeMode, setIsPracticeMode } = useStore();

  const handlePlay = async () => {
    if (!isPlaying) {
      await audioEngine.initialize();
      setIsPlaying(true);

      // Calculate the end position of the song
      const noteEndPosition = song.notes.length > 0
        ? Math.max(...song.notes.map(note => note.startTime + note.duration))
        : 0;
      const chordEndPosition = song.chords.length > 0
        ? Math.max(...song.chords.map(chord => chord.startTime + chord.duration))
        : 0;
      const songEndPosition = Math.max(noteEndPosition, chordEndPosition);

      // Determine start position based on cursor location
      let startPosition = cursorPosition;

      // If cursor is at the end (or very close to it), start from beginning
      if (Math.abs(cursorPosition - songEndPosition) < 0.1) {
        startPosition = 0;
        setCursorPosition(0);
      }

      // Initialize currentBeat to the start position to avoid visual jump
      setCurrentBeat(startPosition);

      if (isPracticeMode) {
        // In practice mode, only start the beat counter without audio
        audioEngine.startPlaybackWithoutAudio(
          song.tempo,
          (beat) => {
            setCurrentBeat(beat);
          },
          () => {
            setIsPlaying(false);
            setCurrentBeat(0);
            setCursorPosition(songEndPosition);
          },
          startPosition
        );
      } else {
        // Normal editor mode with audio
        audioEngine.startPlayback(
          song.notes,
          song.chords,
          song.key,
          song.tempo,
          (beat) => setCurrentBeat(beat),
          (endPosition) => {
            setIsPlaying(false);
            setCurrentBeat(0);
            // Position cursor after the last note
            setCursorPosition(endPosition || 0);
          },
          startPosition
        );
      }
    } else {
      audioEngine.stopPlayback();
      setIsPlaying(false);
      setCurrentBeat(0);
      setCursorPosition(cursorPosition);
    }
  };

  const handleRewind = () => {
    audioEngine.stopPlayback();
    audioEngine.rewind();
    setIsPlaying(false);
    setCurrentBeat(0);
    setCursorPosition(0);
  };

  const handleTogglePracticeMode = () => {
    if (isPlaying) {
      audioEngine.stopPlayback();
      setIsPlaying(false);
      setCurrentBeat(0);
    }
    setIsPracticeMode(!isPracticeMode);
  };

  return (
    <Container>
      <PlayButton onClick={handlePlay} $isPlaying={isPlaying}>
        {isPlaying ? '■' : '▶'}
      </PlayButton>
      <ControlButton onClick={handleRewind}>⏮</ControlButton>
      <ToggleButton onClick={handleTogglePracticeMode} $isActive={isPracticeMode}>
        {isPracticeMode ? 'Editor' : 'Practice'}
      </ToggleButton>
    </Container>
  );
}