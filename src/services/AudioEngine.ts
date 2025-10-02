import * as Tone from 'tone';
import { Note } from '../types';

class AudioEngine {
  private sampler: Tone.Sampler | null = null;
  private isInitialized = false;

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

  async playNote(pitch: string, duration: number = 1) {
    if (!this.sampler) {
      return;
    }

    if (!this.isInitialized) {
      return;
    }

    await Tone.start();

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

  async startPlayback(notes: Note[], tempo: number, onBeat: (beat: number) => void, onComplete: (endPosition?: number) => void, startPosition: number = 0) {
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

    const maxTime = notes.reduce((max, note) => Math.max(max, note.startTime + note.duration), 0);

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