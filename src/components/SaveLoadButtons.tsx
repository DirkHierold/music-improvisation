import { useState } from 'react';
import styled from 'styled-components';
import { useStore } from '../store';

const Container = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const Button = styled.button`
  padding: 8px 16px;
  background-color: #444;
  border: 1px solid #666;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #555;
  }

  &:active {
    background-color: #333;
  }
`;

const Input = styled.input`
  padding: 8px 12px;
  background-color: #2a2a2a;
  border: 1px solid #666;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  min-width: 200px;

  &:focus {
    outline: none;
    border-color: #888;
  }
`;

const Select = styled.select`
  padding: 8px 12px;
  background-color: #2a2a2a;
  border: 1px solid #666;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  min-width: 200px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #888;
  }

  option {
    background-color: #2a2a2a;
  }
`;

export function SaveLoadButtons() {
  const { saveSong, loadSong, getSavedSongs, loadPresetSong, getPresetSongs } = useStore();
  const [songName, setSongName] = useState('');
  const [selectedSong, setSelectedSong] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const savedSongs = getSavedSongs();
  const presetSongs = getPresetSongs();

  const handleSave = () => {
    if (songName.trim()) {
      saveSong(songName.trim());
      setSongName('');
      alert(`Song "${songName.trim()}" saved successfully!`);
    }
  };

  const handleLoad = () => {
    if (selectedSong) {
      const success = loadSong(selectedSong);
      if (success) {
        alert(`Song "${selectedSong}" loaded successfully!`);
      } else {
        alert(`Failed to load song "${selectedSong}"`);
      }
    }
  };

  const handleLoadPreset = () => {
    if (selectedPreset) {
      const success = loadPresetSong(selectedPreset);
      if (success) {
        alert(`Preset song "${selectedPreset}" loaded successfully!`);
      } else {
        alert(`Failed to load preset song "${selectedPreset}"`);
      }
    }
  };

  return (
    <Container>
      <Input
        type="text"
        placeholder="Song name..."
        value={songName}
        onChange={(e) => setSongName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
      />
      <Button onClick={handleSave}>Save</Button>

      <Select
        value={selectedSong}
        onChange={(e) => setSelectedSong(e.target.value)}
      >
        <option value="">Select a song...</option>
        {savedSongs.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </Select>
      <Button onClick={handleLoad}>Load</Button>

      <Select
        value={selectedPreset}
        onChange={(e) => setSelectedPreset(e.target.value)}
      >
        <option value="">Select a preset...</option>
        {presetSongs.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </Select>
      <Button onClick={handleLoadPreset}>Load Preset</Button>
    </Container>
  );
}