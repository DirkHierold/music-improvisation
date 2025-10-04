import * as Tone from 'tone';
import { Note, Chord, MAJOR_SCALES } from '../types';

class AudioEngine {
  private sampler: Tone.Sampler | null = null;
  private isInitialized = false;

  private getChordNotes(roman: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII', key: string): string[] {
    const scaleNotes = MAJOR_SCALES[key] || MAJOR_SCALES['C Major'];

    // Map Roman numeral to scale degree index
    const romanToIndex: Record<string, number> = {
      'I': 0, 'II': 1, 'III': 2, 'IV': 3, 'V': 4, 'VI': 5, 'VII': 6
    };

    const rootIndex = romanToIndex[roman];
    const root = scaleNotes[rootIndex];
    const third = scaleNotes[(rootIndex + 2) % 7];
    const fifth = scaleNotes[(rootIndex + 4) % 7];

    // Determine chord quality based on scale degree in major key
    // I, IV, V are major; II, III, VI are minor; VII is diminished
    let thirdNote = third;
    let fifthNote = fifth;

    // For minor chords (II, III, VI), lower the third by a semitone
    if (roman === 'II' || roman === 'III' || roman === 'VI') {
      thirdNote = this.lowerBySemitone(third);
    }

    // For diminished chord (VII), lower both third and fifth by a semitone
    if (roman === 'VII') {
      thirdNote = this.lowerBySemitone(third);
      fifthNote = this.lowerBySemitone(fifth);
    }

    // Add octave 4 to all notes (or 5 for wrapped notes)
    const rootOctave = 4;
    const thirdOctave = this.needsOctaveAdjustment(root, thirdNote) ? 5 : 4;
    const fifthOctave = this.needsOctaveAdjustment(root, fifthNote) ? 5 : 4;

    return [`${root}${rootOctave}`, `${thirdNote}${thirdOctave}`, `${fifthNote}${fifthOctave}`];
  }

  private lowerBySemitone(note: string): string {
    const chromaticScale = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

    // Normalize sharp to flat
    const normalizedNote = note.replace('#', 'b');

    // Find note in chromatic scale
    let noteIndex = chromaticScale.findIndex(n => {
      const baseNote = n.replace('b', '');
      const inputBaseNote = normalizedNote.replace('b', '').replace('#', '');
      return baseNote === inputBaseNote &&
             ((n.includes('b') && normalizedNote.includes('b')) ||
              (!n.includes('b') && !normalizedNote.includes('b')));
    });

    if (noteIndex === -1) {
      // Try to find by base note only
      const baseNote = note.charAt(0);
      noteIndex = chromaticScale.findIndex(n => n.charAt(0) === baseNote);
    }

    if (noteIndex === -1) return note; // Fallback

    // Lower by semitone
    const newIndex = (noteIndex - 1 + 12) % 12;
    return chromaticScale[newIndex];
  }

  private needsOctaveAdjustment(root: string, other: string): boolean {
    const noteOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const rootBase = root.charAt(0);
    const otherBase = other.charAt(0);

    const rootIndex = noteOrder.indexOf(rootBase);
    const otherIndex = noteOrder.indexOf(otherBase);

    // If the other note comes before the root in the scale, it needs octave adjustment
    return otherIndex < rootIndex;
  }

  async initialize() {
    if (this.isInitialized) return;

    return new Promise<void>((resolve) => {
      this.sampler = new Tone.Sampler({
        urls: {
          C3: 'C3.mp3',
          C4: 'C4.mp3',
          C5: 'C5.mp3',
        },
        baseUrl: 'https://tonejs.github.io/audio/salamander/',
        onload: () => {
          this.isInitialized = true;
          resolve();
        },
        onerror: (error) => {
          console.warn('Sampler loading failed, using fallback:', error);
          this.isInitialized = true; // Set to true so playNote can use fallback
          resolve(); // Don't reject, just use fallback
        }
      }).toDestination();

      // Timeout fallback
      setTimeout(() => {
        if (!this.isInitialized) {
          this.isInitialized = true;
          resolve();
        }
      }, 5000);
    });
  }

  playNote(pitch: string, duration: number = 1) {
    if (!this.sampler) {
      return;
    }

    if (!this.isInitialized) {
      return;
    }

    // Only start Tone.js context if needed (non-blocking)
    if (Tone.context.state !== 'running') {
      Tone.start();
    }

    try {
      this.sampler.triggerAttackRelease(pitch, duration);
    } catch (error) {
      // Fallback to basic oscillator if samples fail
      try {
        const synth = new Tone.Synth().toDestination();
        synth.triggerAttackRelease(pitch, duration);
        // Clean up after use
        setTimeout(() => {
          synth.dispose();
        }, (duration + 0.1) * 1000);
      } catch (fallbackError) {
        // Both failed - continue silently
      }
    }
  }

  playChord(roman: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII', key: string, duration: number = 1) {
    if (!this.sampler) {
      return;
    }

    if (!this.isInitialized) {
      return;
    }

    // Only start Tone.js context if needed (non-blocking)
    if (Tone.context.state !== 'running') {
      Tone.start();
    }

    const chordNotes = this.getChordNotes(roman, key);

    try {
      this.sampler.triggerAttackRelease(chordNotes, duration);
    } catch (error) {
      // Fallback to basic oscillator if samples fail
      try {
        const synths = chordNotes.map(() => new Tone.Synth().toDestination());
        synths.forEach((synth, i) => {
          synth.triggerAttackRelease(chordNotes[i], duration);
        });
        // Clean up after use
        setTimeout(() => {
          synths.forEach(synth => synth.dispose());
        }, (duration + 0.1) * 1000);
      } catch (fallbackError) {
        // Both failed - continue silently
      }
    }
  }

  async startPlayback(notes: Note[], chords: Chord[], key: string, tempo: number, onBeat: (beat: number) => void, onComplete: (endPosition?: number) => void, startPosition: number = 0) {
    await Tone.start();
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    Tone.getTransport().bpm.value = tempo;

    // Filter notes that should be played (start after the current position)
    const notesToPlay = notes.filter(note => note.startTime >= startPosition);

    notesToPlay.forEach((note) => {
      Tone.getTransport().schedule((time) => {
        const durationInSeconds = (note.duration * 60) / tempo;
        this.sampler?.triggerAttackRelease(note.pitch, durationInSeconds, time);
      }, `0:${note.startTime - startPosition}`);
    });

    // Schedule chords
    const chordsToPlay = chords.filter(chord => chord.startTime >= startPosition);

    chordsToPlay.forEach((chord) => {
      Tone.getTransport().schedule((time) => {
        const durationInSeconds = (chord.duration * 60) / tempo;
        const chordNotes = this.getChordNotes(chord.roman, key);
        this.sampler?.triggerAttackRelease(chordNotes, durationInSeconds, time);
      }, `0:${chord.startTime - startPosition}`);
    });

    const maxNoteTime = notes.reduce((max, note) => Math.max(max, note.startTime + note.duration), 0);
    const maxChordTime = chords.reduce((max, chord) => Math.max(max, chord.startTime + chord.duration), 0);
    const maxTime = Math.max(maxNoteTime, maxChordTime);

    // Schedule completion based on the original song length, adjusted for start position
    const playbackDuration = Math.max(0, maxTime - startPosition);

    Tone.getTransport().schedule((time) => {
      Tone.getDraw().schedule(() => {
        this.stopPlayback();
        onComplete(maxTime);
      }, time);
    }, `0:${playbackDuration}`);

    Tone.getTransport().start();

    const updateInterval = setInterval(() => {
      const currentBeat = startPosition + (Tone.getTransport().seconds * (tempo / 60));
      onBeat(currentBeat);
    }, 50);

    (Tone.getTransport() as ReturnType<typeof Tone.getTransport> & { _updateInterval?: NodeJS.Timeout })._updateInterval = updateInterval;
  }

  stopPlayback() {
    // Stop regular playback
    const transport = Tone.getTransport() as ReturnType<typeof Tone.getTransport> & { _updateInterval?: NodeJS.Timeout };
    if (transport._updateInterval) {
      clearInterval(transport._updateInterval);
      delete transport._updateInterval;
    }
    Tone.getTransport().stop();

    // Stop practice mode
    if ((this as any)._practiceInterval) {
      clearInterval((this as any)._practiceInterval);
      delete (this as any)._practiceInterval;
    }

    // Stop practice animation
    if ((this as any)._practiceAnimationId) {
      cancelAnimationFrame((this as any)._practiceAnimationId);
      delete (this as any)._practiceAnimationId;
    }
  }

  async startPlaybackWithoutAudio(tempo: number, onBeat: (beat: number) => void, onComplete: () => void, startPosition: number = 0) {
    await Tone.start();

    // Stop any existing playback
    this.stopPlayback();

    const startTime = performance.now();
    const beatsPerSecond = tempo / 60;


    const updateLoop = () => {
      const elapsedSeconds = (performance.now() - startTime) / 1000;
      const currentBeat = startPosition + (elapsedSeconds * beatsPerSecond);

      try {
        onBeat(currentBeat);
      } catch (error) {
        // Error in onBeat callback - continue silently
      }

      // Auto-complete after 10 minutes
      if (elapsedSeconds > 600) {
        this.stopPlayback();
        onComplete();
        return;
      }

      // Continue the animation loop if practice is still running
      if ((this as any)._practiceAnimationId) {
        (this as any)._practiceAnimationId = requestAnimationFrame(updateLoop);
      }
    };

    // Start the animation loop
    (this as any)._practiceAnimationId = requestAnimationFrame(updateLoop);
  }

  rewind() {
    Tone.getTransport().position = 0;
  }
}

export const audioEngine = new AudioEngine();