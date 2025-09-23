import { describe, it, expect } from 'vitest';
import { MAJOR_SCALES, CHROMATIC_NOTES, NOTE_COLORS } from '../types';

describe('Musical Types and Constants', () => {
  describe('CHROMATIC_NOTES', () => {
    it('should contain exactly 12 chromatic notes', () => {
      expect(CHROMATIC_NOTES).toHaveLength(12);
    });

    it('should start with C and end with B', () => {
      expect(CHROMATIC_NOTES[0]).toBe('C');
      expect(CHROMATIC_NOTES[11]).toBe('B');
    });

    it('should contain all sharp notes in chromatic scale', () => {
      const sharps = ['C#', 'D#', 'F#', 'G#', 'A#'];
      sharps.forEach(note => {
        expect(CHROMATIC_NOTES).toContain(note);
      });
    });
  });

  describe('MAJOR_SCALES', () => {
    it('should contain 12 major scales', () => {
      expect(Object.keys(MAJOR_SCALES)).toHaveLength(12);
    });

    it('each scale should have exactly 7 notes', () => {
      Object.values(MAJOR_SCALES).forEach(scale => {
        expect(scale).toHaveLength(7);
      });
    });

    it('C Major should have no sharps or flats', () => {
      const cMajor = MAJOR_SCALES['C Major'];
      expect(cMajor).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    });

    it('G Major should have one sharp (F#)', () => {
      const gMajor = MAJOR_SCALES['G Major'];
      expect(gMajor).toContain('F#');
      expect(gMajor.filter(note => note.includes('#') || note.includes('b'))).toHaveLength(1);
    });

    it('F Major should have one flat (Bb)', () => {
      const fMajor = MAJOR_SCALES['F Major'];
      expect(fMajor).toContain('Bb');
      expect(fMajor.filter(note => note.includes('b'))).toHaveLength(1);
    });
  });

  describe('NOTE_COLORS', () => {
    it('should have colors for all natural notes', () => {
      const naturalNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      naturalNotes.forEach(note => {
        expect(NOTE_COLORS).toHaveProperty(note);
        expect(NOTE_COLORS[note]).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('should use different colors for different notes', () => {
      const colors = Object.values(NOTE_COLORS);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });
});