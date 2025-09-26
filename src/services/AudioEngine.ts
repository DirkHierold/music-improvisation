import * as Tone from 'tone';
import { Note } from '../types';

class AudioEngine {
  private sampler: Tone.Sampler | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    return new Promise<void>((resolve, reject) => {
      this.sampler = new Tone.Sampler({
        urls: {
          C3: 'C3.mp3',
          C4: 'C4.mp3',
          C5: 'C5.mp3',
        },
        baseUrl: 'https://tonejs.github.io/audio/salamander/',
        onload: () => {
          console.log('Piano samples loaded');
          this.isInitialized = true;
          resolve();
        },
        onerror: (error) => {
          console.error('Failed to load piano samples:', error);
          console.warn('Will use fallback synthesis');
          this.isInitialized = true; // Set to true so playNote can use fallback
          resolve(); // Don't reject, just use fallback
        }
      }).toDestination();

      // Timeout fallback
      setTimeout(() => {
        if (!this.isInitialized) {
          console.warn('Sample loading timed out, using fallback synthesis');
          this.isInitialized = true;
          resolve();
        }
      }, 5000);
    });
  }

  async playNote(pitch: string, duration: number = 1) {
    if (!this.sampler) {
      console.warn('AudioEngine not initialized');
      return;
    }

    if (!this.isInitialized) {
      console.warn('AudioEngine samples not loaded yet');
      return;
    }

    await Tone.start();

    try {
      this.sampler.triggerAttackRelease(pitch, duration);
    } catch (error) {
      console.error('Error playing note:', error);
      console.warn('Retrying with basic oscillator');
      // Fallback to basic oscillator if samples fail
      try {
        const synth = new Tone.Synth().toDestination();
        synth.triggerAttackRelease(pitch, duration);
        // Clean up after use
        setTimeout(() => {
          synth.dispose();
        }, (duration + 0.1) * 1000);
      } catch (fallbackError) {
        console.error('Fallback oscillator also failed:', fallbackError);
      }
    }
  }

  async startPlayback(notes: Note[], tempo: number, onBeat: (beat: number) => void, onComplete: () => void) {
    await Tone.start();
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    Tone.getTransport().bpm.value = tempo;

    notes.forEach((note) => {
      Tone.getTransport().schedule((time) => {
        const durationInSeconds = (note.duration * 60) / tempo;
        this.sampler?.triggerAttackRelease(note.pitch, durationInSeconds, time);
      }, `0:${note.startTime}`);
    });

    const maxTime = notes.reduce((max, note) => Math.max(max, note.startTime + note.duration), 0);

    Tone.getTransport().schedule((time) => {
      Tone.getDraw().schedule(() => {
        this.stopPlayback();
        onComplete();
      }, time);
    }, `0:${maxTime}`);

    Tone.getTransport().start();

    const updateInterval = setInterval(() => {
      const currentBeat = Tone.getTransport().seconds * (tempo / 60);
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
      console.log('🛑 Stopping practice interval');
      clearInterval((this as any)._practiceInterval);
      delete (this as any)._practiceInterval;
    }

    // Stop practice animation
    if ((this as any)._practiceAnimationId) {
      console.log('🛑 Stopping practice animation');
      cancelAnimationFrame((this as any)._practiceAnimationId);
      delete (this as any)._practiceAnimationId;
    }
  }

  async startPlaybackWithoutAudio(tempo: number, onBeat: (beat: number) => void, onComplete: () => void) {
    await Tone.start();

    // Stop any existing playback
    this.stopPlayback();

    const startTime = performance.now();
    const beatsPerSecond = tempo / 60;

    console.log(`🎵 Starting practice mode: ${tempo} BPM, ${beatsPerSecond} beats/sec`);

    const updateLoop = () => {
      const elapsedSeconds = (performance.now() - startTime) / 1000;
      const currentBeat = elapsedSeconds * beatsPerSecond;

      // Log less frequently to reduce spam
      if (Math.floor(currentBeat * 10) !== Math.floor(((this as any)._lastLoggedBeat || 0) * 10)) {
        console.log(`⏱️ Practice beat: ${currentBeat.toFixed(2)} - calling onBeat()`);
        (this as any)._lastLoggedBeat = currentBeat;
      }

      try {
        onBeat(currentBeat);
        if (Math.floor(currentBeat * 10) !== Math.floor(((this as any)._lastLoggedBeat || 0) * 10)) {
          console.log(`✅ onBeat() called successfully`);
        }
      } catch (error) {
        console.error('❌ Error in onBeat callback:', error);
      }

      // Auto-complete after 10 minutes
      if (elapsedSeconds > 600) {
        console.log('⏰ Practice mode timeout');
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