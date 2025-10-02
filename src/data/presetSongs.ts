import { Song } from '../types';

export const presetSongs: Record<string, Song> = {
  'Ocean Eyes': {
    tempo: 72,
    meter: {
      beatsPerMeasure: 4,
      beatUnit: 4,
    },
    key: 'G Major',
    notes: [
      // Measure 1: C chord pattern (ukulele tuning: G-C-E-A)
      { id: 'note-1', pitch: 'D5', startTime: 0, duration: 0.75 }, // 7th fret G string
      { id: 'note-2', pitch: 'F4', startTime: 0.75, duration: 0.25 }, // 5th fret C string

      // Measure 2: D chord
      { id: 'note-3', pitch: 'D5', startTime: 1, duration: 0.5 }, // 7th fret G string
      { id: 'note-4', pitch: 'F4', startTime: 1.5, duration: 0.5 }, // 5th fret C string
      { id: 'note-5', pitch: 'G4', startTime: 2, duration: 0.5 }, // 3rd fret E string

      // Measure 3: Em chord
      { id: 'note-6', pitch: 'G4', startTime: 3, duration: 0.75 },
      { id: 'note-7', pitch: 'E4', startTime: 3.75, duration: 0.25 },

      // Measure 4: C chord (whole note)
      { id: 'note-8', pitch: 'G4', startTime: 4, duration: 1 },

      // Measure 5: D chord
      { id: 'note-9', pitch: 'G4', startTime: 5, duration: 0.75 },
      { id: 'note-10', pitch: 'E4', startTime: 5.75, duration: 0.25 },

      // Measure 6: Em chord with melody
      { id: 'note-11', pitch: 'G4', startTime: 6, duration: 0.25 },
      { id: 'note-12', pitch: 'E4', startTime: 6.25, duration: 0.25 },
      { id: 'note-13', pitch: 'D4', startTime: 6.5, duration: 0.25 },
      { id: 'note-14', pitch: 'E4', startTime: 6.75, duration: 0.25 },

      // Measure 7-8: G - C progression
      { id: 'note-15', pitch: 'G4', startTime: 7, duration: 0.5 },
      { id: 'note-16', pitch: 'E4', startTime: 7.5, duration: 0.5 },
      { id: 'note-17', pitch: 'C4', startTime: 8, duration: 1 },

      // Measure 9-10: G - C
      { id: 'note-18', pitch: 'G4', startTime: 9, duration: 0.75 },
      { id: 'note-19', pitch: 'E4', startTime: 9.75, duration: 0.25 },
      { id: 'note-20', pitch: 'G4', startTime: 10, duration: 0.5 },

      // Measure 11: C - D - Em transition
      { id: 'note-21', pitch: 'G4', startTime: 11, duration: 0.25 },
      { id: 'note-22', pitch: 'D4', startTime: 11.25, duration: 0.25 },
      { id: 'note-23', pitch: 'E4', startTime: 11.5, duration: 0.25 },
      { id: 'note-24', pitch: 'D4', startTime: 11.75, duration: 0.25 },

      // Measure 12: Em chord (whole note)
      { id: 'note-25', pitch: 'D4', startTime: 12, duration: 1 },

      // Measures 13-16: Melodic section
      { id: 'note-26', pitch: 'D4', startTime: 13, duration: 0.5 },
      { id: 'note-27', pitch: 'E4', startTime: 13.5, duration: 0.25 },
      { id: 'note-28', pitch: 'D4', startTime: 13.75, duration: 0.25 },

      { id: 'note-29', pitch: 'E4', startTime: 14, duration: 0.5 },
      { id: 'note-30', pitch: 'D4', startTime: 14.5, duration: 0.5 },

      { id: 'note-31', pitch: 'D4', startTime: 15, duration: 0.25 },
      { id: 'note-32', pitch: 'C4', startTime: 15.25, duration: 0.25 },
      { id: 'note-33', pitch: 'C4', startTime: 15.5, duration: 0.25 },
      { id: 'note-34', pitch: 'C4', startTime: 15.75, duration: 0.25 },

      // Fast melodic run
      { id: 'note-35', pitch: 'D4', startTime: 16, duration: 0.125 },
      { id: 'note-36', pitch: 'D4', startTime: 16.125, duration: 0.125 },
      { id: 'note-37', pitch: 'D4', startTime: 16.25, duration: 0.125 },
      { id: 'note-38', pitch: 'C4', startTime: 16.375, duration: 0.125 },
      { id: 'note-39', pitch: 'C4', startTime: 16.5, duration: 0.25 },
      { id: 'note-40', pitch: 'D4', startTime: 16.75, duration: 0.25 },

      // Measures 17-20: Outro
      { id: 'note-41', pitch: 'C4', startTime: 17, duration: 0.25 },
      { id: 'note-42', pitch: 'C4', startTime: 17.25, duration: 0.25 },
      { id: 'note-43', pitch: 'C4', startTime: 17.5, duration: 0.25 },
      { id: 'note-44', pitch: 'D4', startTime: 17.75, duration: 0.25 },

      { id: 'note-45', pitch: 'G4', startTime: 18, duration: 0.5 },
      { id: 'note-46', pitch: 'E4', startTime: 18.5, duration: 0.5 },

      { id: 'note-47', pitch: 'C4', startTime: 19, duration: 0.5 },
      { id: 'note-48', pitch: 'E4', startTime: 19.5, duration: 0.5 },
      { id: 'note-49', pitch: 'G4', startTime: 20, duration: 1 },
    ],
  },
};