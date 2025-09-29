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
            setCursorPosition(0);
          }
        );
      } else {
        // Normal editor mode with audio
        audioEngine.startPlayback(
          song.notes,
          song.tempo,
          (beat) => setCurrentBeat(beat),
          () => {
            setIsPlaying(false);
            setCurrentBeat(0);
            setCursorPosition(0);
          }
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