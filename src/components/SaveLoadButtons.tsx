import { useRef, useState } from 'react';
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

const HiddenFileInput = styled.input`
  display: none;
`;

export function SaveLoadButtons() {
  const { saveSong, loadSong, setSelectedNoteId, setSelectedChordId } = useStore();
  const [filename, setFilename] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    const trimmedFilename = filename.trim();

    if (!trimmedFilename) {
      alert('Please enter a filename');
      return;
    }

    try {
      await saveSong(trimmedFilename + '.musicxml');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save file');
    }
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const success = await loadSong(file);
      if (success) {
        // Extract filename without extension
        const nameWithoutExtension = file.name.replace(/\.(musicxml|xml|mxl)$/i, '');
        setFilename(nameWithoutExtension);
        alert(`Song "${file.name}" loaded successfully!`);
      } else {
        alert(`Failed to load song "${file.name}"`);
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleInputFocus = () => {
    setSelectedNoteId(null);
    setSelectedChordId(null);
  };

  return (
    <Container>
      <Input
        type="text"
        placeholder="Song name (required)..."
        value={filename}
        onChange={(e) => setFilename(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        onFocus={handleInputFocus}
      />
      <Button onClick={handleSave}>Save</Button>

      <HiddenFileInput
        ref={fileInputRef}
        type="file"
        accept=".musicxml,.xml,.mxl"
        onChange={handleFileChange}
      />
      <Button onClick={handleLoadClick}>Load</Button>
    </Container>
  );
}