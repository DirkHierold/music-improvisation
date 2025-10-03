import { Song, Note, Chord, MAJOR_SCALES } from '../types';

/**
 * Converts a Song object to MusicXML format
 */
export function songToMusicXML(song: Song): string {
  const { tempo, meter, key, notes, chords } = song;

  // Extract key information (assuming format "C Major")
  const keyNote = key.split(' ')[0];
  const mode = key.split(' ')[1]?.toLowerCase() || 'major';

  // Sort notes by start time
  const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);

  // Calculate divisions (pulses per quarter note)
  const divisions = 4;

  // Build MusicXML
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>Improvisation</work-title>
  </work>
  <identification>
    <encoding>
      <software>Music Improvisation App</software>
      <encoding-date>${new Date().toISOString().split('T')[0]}</encoding-date>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>${getFifths(keyNote)}</fifths>
          <mode>${mode}</mode>
        </key>
        <time>
          <beats>${meter.beatsPerMeasure}</beats>
          <beat-type>${meter.beatUnit}</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <sound tempo="${tempo}"/>
${generateNotesAndChordsXML(sortedNotes, chords, divisions, meter.beatsPerMeasure, key)}
    </measure>
  </part>
</score-partwise>`;

  return xml;
}

/**
 * Parses MusicXML and converts it to a Song object
 */
export function musicXMLToSong(xmlString: string): Song {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Extract tempo
  const soundElement = xmlDoc.querySelector('sound[tempo]');
  const tempo = soundElement ? parseInt(soundElement.getAttribute('tempo') || '120') : 120;

  // Extract time signature
  const beatsElement = xmlDoc.querySelector('time beats');
  const beatTypeElement = xmlDoc.querySelector('time beat-type');
  const beatsPerMeasure = beatsElement ? parseInt(beatsElement.textContent || '4') : 4;
  const beatUnit = beatTypeElement ? parseInt(beatTypeElement.textContent || '4') : 4;

  // Extract key
  const fifthsElement = xmlDoc.querySelector('key fifths');
  const modeElement = xmlDoc.querySelector('key mode');
  const fifths = fifthsElement ? parseInt(fifthsElement.textContent || '0') : 0;
  const mode = modeElement?.textContent || 'major';
  const keyNote = getKeyFromFifths(fifths);
  const key = `${keyNote} ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;

  // Extract notes
  const noteElements = xmlDoc.querySelectorAll('note');
  const notes: Note[] = [];
  const divisions = parseInt(xmlDoc.querySelector('attributes divisions')?.textContent || '4');

  let currentTime = 0;
  let lastNonChordTime = 0;

  noteElements.forEach((noteElement) => {
    // Check if it's a rest
    if (noteElement.querySelector('rest')) {
      const durationElement = noteElement.querySelector('duration');
      const duration = durationElement ? parseInt(durationElement.textContent || '0') : 0;
      currentTime += duration / divisions;
      lastNonChordTime = currentTime;
      return;
    }

    const pitchElement = noteElement.querySelector('pitch');
    if (!pitchElement) return;

    // Check if this is a chord note
    const isChord = noteElement.querySelector('chord') !== null;

    const step = pitchElement.querySelector('step')?.textContent || 'C';
    const alter = pitchElement.querySelector('alter')?.textContent;
    const octave = pitchElement.querySelector('octave')?.textContent || '4';

    let pitchName = step;
    if (alter === '1') pitchName += '#';
    if (alter === '-1') pitchName += 'b';

    const pitch = `${pitchName}${octave}`;

    const durationElement = noteElement.querySelector('duration');
    const duration = durationElement ? parseInt(durationElement.textContent || '0') / divisions : 1;

    // If this is a chord note, use the last non-chord time
    const noteStartTime = isChord ? lastNonChordTime : currentTime;

    notes.push({
      id: crypto.randomUUID(),
      pitch,
      startTime: noteStartTime,
      duration
    });

    // Only advance time if it's not a chord note
    if (!isChord) {
      currentTime += duration;
      lastNonChordTime = noteStartTime;
    }
  });

  // Extract chords from harmony elements
  const harmonyElements = xmlDoc.querySelectorAll('harmony');
  const chords: Chord[] = [];

  let chordTime = 0;
  harmonyElements.forEach((harmonyElement) => {
    const rootElement = harmonyElement.querySelector('root root-step');
    const kindElement = harmonyElement.querySelector('kind');
    const offsetElement = harmonyElement.querySelector('offset');

    if (rootElement && kindElement) {
      const rootStep = rootElement.textContent || '';

      // Map root step to Roman numeral based on key
      const scaleNotes = MAJOR_SCALES[key] || MAJOR_SCALES['C Major'];

      // Find which scale degree this root corresponds to
      let degree = -1;
      for (let i = 0; i < scaleNotes.length; i++) {
        if (scaleNotes[i].charAt(0) === rootStep) {
          degree = i;
          break;
        }
      }

      const degreeToRoman: Record<number, 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII'> = {
        0: 'I', 1: 'II', 2: 'III', 3: 'IV', 4: 'V', 5: 'VI', 6: 'VII'
      };

      const roman = degreeToRoman[degree];

      if (roman) {
        const offset = offsetElement ? parseInt(offsetElement.textContent || '0') / divisions : 0;

        chords.push({
          id: crypto.randomUUID(),
          roman,
          startTime: chordTime + offset,
          duration: 1 // Default duration, will be updated if we find duration info
        });
      }
    }

    // Advance chord time (simplified)
    chordTime += 1;
  });

  return {
    tempo,
    meter: { beatsPerMeasure, beatUnit },
    key,
    notes,
    chords
  };
}

/**
 * Saves a MusicXML file to the Downloads folder
 */
export async function saveMusicXMLFile(song: Song, filename: string): Promise<void> {
  const xml = songToMusicXML(song);
  const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });

  // Create object URL
  const url = URL.createObjectURL(blob);

  // Create download link with proper filename
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.musicxml') ? filename : `${filename}.musicxml`;

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Reads and parses a MusicXML file
 */
export function loadMusicXMLFile(file: File): Promise<Song> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const xmlString = e.target?.result as string;
        const song = musicXMLToSong(xmlString);
        resolve(song);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Helper functions

function generateNotesAndChordsXML(notes: Note[], chords: Chord[], divisions: number, beatsPerMeasure: number, key: string): string {
  const notesXML = generateNotesXML(notes, divisions, beatsPerMeasure);
  const chordsXML = generateChordsXML(chords, divisions, key);

  // Interleave chords with notes based on timing
  // For simplicity, we'll add all chords first, then notes
  return chordsXML + (chordsXML && notesXML ? '\n' : '') + notesXML;
}

function generateChordsXML(chords: Chord[], divisions: number, key: string): string {
  if (chords.length === 0) return '';

  const scaleNotes = MAJOR_SCALES[key] || MAJOR_SCALES['C Major'];

  const sortedChords = [...chords].sort((a, b) => a.startTime - b.startTime);

  return sortedChords.map(chord => {
    const romanToIndex: Record<string, number> = {
      'I': 0, 'II': 1, 'III': 2, 'IV': 3, 'V': 4, 'VI': 5, 'VII': 6
    };

    const degree = romanToIndex[chord.roman];
    const rootStep = scaleNotes[degree];

    // Determine chord quality
    let kind = 'major';
    if (chord.roman === 'II' || chord.roman === 'III' || chord.roman === 'VI') {
      kind = 'minor';
    } else if (chord.roman === 'VII') {
      kind = 'diminished';
    }

    const offset = Math.round(chord.startTime * divisions);

    return `      <harmony>
        <root>
          <root-step>${rootStep.charAt(0)}</root-step>${rootStep.includes('#') ? '\n          <root-alter>1</root-alter>' : ''}${rootStep.includes('b') ? '\n          <root-alter>-1</root-alter>' : ''}
        </root>
        <kind>${kind}</kind>
        <offset>${offset}</offset>
      </harmony>`;
  }).join('\n');
}

function generateNotesXML(notes: Note[], divisions: number, beatsPerMeasure: number): string {
  if (notes.length === 0) {
    // Empty measure - add a whole rest
    return `      <note>
        <rest/>
        <duration>${divisions * beatsPerMeasure}</duration>
      </note>`;
  }

  const xmlParts: string[] = [];
  let currentTime = 0;
  let previousStartTime: number | null = null;

  notes.forEach((note) => {
    const isChord = previousStartTime !== null && note.startTime === previousStartTime;

    // Add rest if there's a gap before this note (and it's not a chord)
    if (!isChord && note.startTime > currentTime) {
      const restDuration = (note.startTime - currentTime) * divisions;
      const restType = getDurationType(note.startTime - currentTime);
      xmlParts.push(`      <note>
        <rest/>
        <duration>${restDuration}</duration>
        <type>${restType}</type>
      </note>`);
    }

    // Add the note
    const { pitch, octave } = parsePitch(note.pitch);
    const noteDuration = note.duration * divisions;
    const noteType = getDurationType(note.duration);

    xmlParts.push(`      <note>${isChord ? '\n        <chord/>' : ''}
        <pitch>
          <step>${pitch.charAt(0)}</step>
${pitch.includes('#') ? '          <alter>1</alter>' : ''}${pitch.includes('b') ? '          <alter>-1</alter>' : ''}
          <octave>${octave}</octave>
        </pitch>
        <duration>${noteDuration}</duration>
        <type>${noteType}</type>
      </note>`);

    previousStartTime = note.startTime;

    // Only advance time if it's not a chord
    if (!isChord) {
      currentTime = note.startTime + note.duration;
    }
  });

  return xmlParts.join('\n');
}

function parsePitch(pitch: string): { pitch: string; octave: string } {
  const match = pitch.match(/^([A-G][#b]?)(\d+)$/);
  if (!match) return { pitch: 'C', octave: '4' };
  return { pitch: match[1], octave: match[2] };
}

function getDurationType(duration: number): string {
  if (duration >= 4) return 'whole';
  if (duration >= 2) return 'half';
  if (duration >= 1) return 'quarter';
  if (duration >= 0.5) return 'eighth';
  return '16th';
}

function getFifths(keyNote: string): number {
  const fifthsMap: Record<string, number> = {
    'Cb': -7, 'Gb': -6, 'Db': -5, 'Ab': -4, 'Eb': -3, 'Bb': -2, 'F': -1,
    'C': 0,
    'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7
  };
  return fifthsMap[keyNote] || 0;
}

function getKeyFromFifths(fifths: number): string {
  const keyMap: Record<number, string> = {
    '-7': 'Cb', '-6': 'Gb', '-5': 'Db', '-4': 'Ab', '-3': 'Eb', '-2': 'Bb', '-1': 'F',
    '0': 'C',
    '1': 'G', '2': 'D', '3': 'A', '4': 'E', '5': 'B', '6': 'F#', '7': 'C#'
  };
  return keyMap[fifths] || 'C';
}
