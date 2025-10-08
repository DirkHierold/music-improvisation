import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { NOTE_COLORS } from '../types';

const SelectorContainer = styled.div<{ $x: number; $y: number }>`
  position: absolute;
  left: ${props => props.$x}px;
  top: ${props => props.$y - 50}px;
  z-index: 1000;
  display: flex;
  gap: 8px;
  background-color: rgba(42, 42, 42, 0.95);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
`;

const NoteOption = styled.div<{ $color: string; $isEmpty: boolean }>`
  width: 35px;
  height: 35px;
  border-radius: 50%;
  background-color: ${props => props.$isEmpty ? 'transparent' : props.$color};
  border: 2px solid ${props => props.$isEmpty ? '#888' : '#fff'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$isEmpty ? '#888' : 'white'};
  font-weight: bold;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: scale(1.15);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
  }
`;

export interface NoteOption {
  pitch: string | null; // null for empty note
  fret: number;
  noteName: string;
}

interface NoteRondelProps {
  x: number;
  y: number;
  stringIndex: number;
  options: NoteOption[];
  onSelect: (option: NoteOption) => void;
  onClose: () => void;
}

export function NoteRondel({ x, y, options, onSelect, onClose }: NoteRondelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <SelectorContainer ref={containerRef} $x={x} $y={y}>
      {options.map((option, index) => {
        const isEmpty = option.pitch === null;
        const color = isEmpty
          ? 'transparent'
          : NOTE_COLORS[option.noteName.replace('#', '').replace('b', '')] || '#888';

        return (
          <NoteOption
            key={`${option.pitch}-${option.fret}-${index}`}
            $color={color}
            $isEmpty={isEmpty}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(option);
            }}
          >
            {isEmpty ? '—' : (option.fret === 0 ? 'O' : option.fret)}
          </NoteOption>
        );
      })}
    </SelectorContainer>
  );
}
