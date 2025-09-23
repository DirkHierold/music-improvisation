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
          console.log('Piano samples loaded');
          this.isInitialized = true;
          resolve();
        }
      }).toDestination();
    });
  }

  async playNote(pitch: string, duration: number = 1) {
    if (!this.sampler) {
      console.warn('AudioEngine not initialized');
      return;
    }

    await Tone.start();
    this.sampler.triggerAttackRelease(pitch, duration);
  }

  async startPlayback(notes: Note[], tempo: number, onBeat: (beat: number) => void, onComplete: () => void) {
    await Tone.start();
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    Tone.getTransport().bpm.value = tempo;

    notes.forEach((note) => {
      const startTimeInSeconds = (note.startTime * 60) / tempo;
      const durationInSeconds = (note.duration * 60) / tempo;

      Tone.getTransport().schedule((time) => {
        this.sampler?.triggerAttackRelease(note.pitch, durationInSeconds, time);
      }, startTimeInSeconds);
    });

    const maxTime = notes.reduce((max, note) => Math.max(max, note.startTime + note.duration), 0);
    const maxTimeInSeconds = (maxTime * 60) / tempo;

    Tone.getTransport().schedule(() => {
      this.stopPlayback();
      onComplete();
    }, maxTimeInSeconds);

    Tone.getTransport().start();

    const updateInterval = setInterval(() => {
      const currentBeat = Tone.getTransport().seconds * (tempo / 60);
      onBeat(currentBeat);
    }, 50);

    (Tone.getTransport() as ReturnType<typeof Tone.getTransport> & { _updateInterval?: NodeJS.Timeout })._updateInterval = updateInterval;
  }

  stopPlayback() {
    const transport = Tone.getTransport() as ReturnType<typeof Tone.getTransport> & { _updateInterval?: NodeJS.Timeout };
    if (transport._updateInterval) {
      clearInterval(transport._updateInterval);
      delete transport._updateInterval;
    }
    Tone.getTransport().stop();
  }

  rewind() {
    Tone.getTransport().position = 0;
  }
}

export const audioEngine = new AudioEngine();