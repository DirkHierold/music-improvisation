import { useEffect } from 'react';
import styled from 'styled-components';
import { useStore } from '../store';

const Container = styled.div`
  display: flex;
  gap: 5px;
  align-items: center;
`;

const Button = styled.button<{ disabled?: boolean }>`
  padding: 8px 16px;
  background-color: ${props => props.disabled ? '#333' : '#444'};
  border: 1px solid #666;
  border-radius: 4px;
  color: ${props => props.disabled ? '#666' : 'white'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-size: 14px;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.disabled ? '#333' : '#555'};
  }

  &:active {
    background-color: ${props => props.disabled ? '#333' : '#333'};
  }
`;

export function UndoRedoButtons() {
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const canUndo = useStore((state) => state.canUndo());
  const canRedo = useStore((state) => state.canRedo());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Z (Mac) or Ctrl+Z (Windows/Linux) for Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
      }
      // Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Windows/Linux) for Redo
      else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      }
      // Alternative: Cmd+Y or Ctrl+Y for Redo
      else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  return (
    <Container>
      <Button onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">
        Undo
      </Button>
      <Button onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)">
        Redo
      </Button>
    </Container>
  );
}
