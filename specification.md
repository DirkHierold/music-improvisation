Absolut. Hier ist die überarbeitete, in sich geschlossene Spezifikation, die alle Ihre klärenden Fragen und Entscheidungen einarbeitet.

***

# Spezifikation für die App "Musical Improvisation"

## 1. Einleitung

Dieses Dokument beschreibt die Spezifikationen für die Webanwendung "Musical Improvisation". Ziel der Anwendung ist es, eine vereinfachte, browserbasierte Umgebung zur Erstellung von Melodien zu schaffen, die sich stark an dem visuellen Design und der Kernfunktionalität der bereitgestellten Bilder orientiert. Die Anwendung wird in TypeScript entwickelt, um eine robuste und wartbare Codebasis zu gewährleisten.

## 2. Kernfunktionalitäten

### 2.1. Audio-Wiedergabe

Eine performante und qualitativ hochwertige Klavierklangwiedergabe ist entscheidend für das Nutzererlebnis.

*   **Technologie**: Die Web Audio API wird verwendet, um eine geringe Latenz und präzise Steuerung der Audiowiedergabe zu ermöglichen.
*   **Klangqualität**: Anstelle von einfachen Oszillatoren werden hochwertige Samples eines echten Klaviers verwendet.
    *   Es wird auf frei verfügbare, lizenzfreie Sample-Quellen zurückgegriffen.
    *   Um eine gute Balance zwischen Ladezeit und Klangqualität zu erreichen, werden Samples für die Noten C3, C4 und C5 geladen. Um alle anderen Noten der chromatischen Tonleiter abzudecken, wird die Tonhöhe dieser Samples mittels "Pitch Shifting" angepasst.
*   **Bibliothek**: Die Bibliothek `Tone.js` wird empfohlen, da sie die Komplexität der Web Audio API abstrahiert und eine einfache Schnittstelle zur Steuerung von Instrumenten, Samples und musikalischen Ereignissen bietet.
*   **Audio-Feedback**:
    *   Beim Hinzufügen einer Note zum Raster wird der entsprechende Ton sofort abgespielt.
    *   Bei jeder Änderung einer Note (z.B. Verschieben, Ändern der Tonhöhe oder Dauer) wird der neue Ton ebenfalls abgespielt.

### 2.2. Noteneingabe und -bearbeitung

Das Herzstück der Anwendung ist das Notenraster (auch "Piano Roll" genannt).

*   **Workflow der Noteneingabe**: Es gibt zwei primäre Methoden, um Noten hinzuzufügen:
    1.  **Einfügen am Cursor**: Ein Klick auf eine der Notenschaltflächen (C, D, E etc.) in der oberen Leiste fügt die entsprechende Note sofort an der aktuellen Position des Abspiel-Cursors im Raster ein. Die Länge der Note wird durch die aktuell im "Duration"-Panel gewählte Einstellung bestimmt.
    2.  **Direktes Klicken im Raster**: Ein Klick auf eine leere Zelle im Raster fügt dort direkt eine Note mit der entsprechenden Tonhöhe der Zeile und der aktuell im "Duration"-Panel gewählten Länge hinzu.
*   **Notenlänge**: Die Dauer der hinzuzufügenden Note wird über das "Duration"-Panel auf der linken Seite ausgewählt (1/4, 1/2, 1, 2, 4 Schläge).
*   **Noten auswählen**: Ein Klick auf eine bereits im Raster platzierte Note wählt diese aus.
*   **Noten verschieben (Ripple-Drag)**: Ausgewählte Noten können per Drag-and-Drop horizontal (zeitlich) und vertikal (Tonhöhe) verschoben werden.
    *   Diese "Ripple-Drag"-Funktion ist **immer aktiv**.
    *   Beim horizontalen Verschieben einer Note werden alle nachfolgenden Noten um die gleiche Distanz mitverschoben. "Nachfolgend" ist definiert als jede Note, deren ursprüngliche Startzeit nach der ursprünglichen Startzeit der gezogenen Note liegt.
*   **Notenlänge ändern**: Die Länge einer Note kann durch Ziehen ihres rechten Randes verändert werden.
*   **Noten löschen**: Eine ausgewählte Note kann durch Drücken der `Entf`- oder `Backspace`-Taste entfernt werden.

### 2.3. Musikalische Parameter

Die globalen musikalischen Einstellungen können jederzeit angepasst werden.

*   **Taktart (Meter)**: Der Nutzer kann die Anzahl der Schläge pro Takt ändern (z.B. von 4 auf 3). Bei einer Änderung verschieben sich nur die visuellen Taktstriche im Raster. Die Position und Länge der Noten bleiben unberührt.
*   **Tonart (Key)**: Der Nutzer kann die Tonart ändern (z.B. C-Dur, G-Dur).
    *   Bei einer Änderung der Tonart werden die in der oberen Leiste angezeigten Notenschaltflächen entsprechend der neuen Tonleiter aktualisiert.
    *   Bestehende Noten im Raster werden transponiert. Die Transposition erfolgt rein **chromatisch**. Alle Noten im Raster, einschließlich jener, die nicht zur ursprünglichen Tonleiter gehörten, werden um die entsprechende Anzahl an Halbtönen nach oben oder unten verschoben.
*   **Tempo (BPM)**: Die Geschwindigkeit der Wiedergabe kann in "Beats Per Minute" (BPM) eingestellt werden.

### 2.4. Wiedergabesteuerung

Die Steuerelemente oben links kontrollieren die Wiedergabe der Melodie.

*   **Play/Stop**: Ein Klick auf den "Play"-Button startet die Wiedergabe der Melodie. Der Button verwandelt sich während der Wiedergabe in einen "Stop"-Button. Ein Klick auf "Stop" hält die Wiedergabe an.
*   **Rewind**: Ein Klick auf den "Rewind"-Button setzt den Abspielkopf zurück an den Anfang der Komposition (Takt 1).

## 3. User Interface (UI) Spezifikation

Das Design soll sich exakt an der Vorlage ![](Bildschirmfoto%202025-09-23%20um%2011.38.14.png) orientieren.

### 3.1. Allgemeines Layout und Styling

*   **Farbschema**:
    *   Hintergrund: `#282828`
    *   Steuerelemente: `#3c3c3c`
    *   Hervorhebungen: `#d3d3d3`
    *   Play-Button: `#e67e22`
    *   Notenfarben: C: Rot, D: Orange, E: Gelb, F: Grün, G: Türkis, A: Violett, B: Magenta.
*   **Typografie**: Klare, serifenlose Schriftart wie "Helvetica Neue" oder "Roboto".
*   **Abstände und Rahmen**: Elemente haben abgerundete Ecken und subtile Trennlinien.

### 3.2. Komponenten im Detail

#### 3.2.1. Obere Steuerleiste

*   **Wiedergabesteuerung (links)**: Besteht aus den Icons für Play (Dreieck) und Rewind (Zurückspulen). Die Buttons "Record" und "Loop" werden nicht implementiert und sind nicht sichtbar.
*   **Musikalische Parameter (Mitte)**: Anzeige für "Beats", "Key" und "Tempo".

#### 3.2.2. Noten- und Dauer-Panel

*   **Duration (links)**: Vertikale Leiste zur Auswahl der Notenlänge. Die ausgewählte Dauer ist durch einen hellblauen Balken hervorgehoben.
*   **Notes in [Key] (Mitte)**: Schaltflächen für die Noten. Die Anzahl und Beschriftung hängt vom "Chromatic"-Schalter ab.
*   **Chromatic-Schalter (rechts)**: Ein Schiebeschalter mit folgender Funktion:
    *   **Deaktiviert (Diatonisch)**: Die Notenauswahlleiste zeigt die 7 Noten der aktuell ausgewählten Tonart.
    *   **Aktiviert (Chromatisch)**: Die Notenauswahlleiste erweitert sich und zeigt alle 12 chromatischen Notenschaltflächen an.

#### 3.2.3. Notenraster (Piano Roll)

*   **Struktur**: Die horizontale Achse repräsentiert die Zeit (Takte/Schläge), die vertikale Achse die Tonhöhe.
*   **Darstellung und Ansicht**:
    *   Der initial sichtbare Tonumfang beträgt **eine Oktave**.
    *   **Chromatic-Schalter-Effekt**: Wenn der Schalter deaktiviert ist, zeigt das Raster nur die Zeilen für die Noten an, die zur ausgewählten Tonart gehören. Bei aktiviertem Schalter werden alle 12 chromatischen Zeilen angezeigt.
*   **Navigation und Skalierung**:
    *   **Kein Scrollen oder Zoomen**: Die Anwendung verfügt über keine manuelle Scroll- oder Zoom-Funktionalität.
    *   **Erweiterung der Länge**: Wird die Komposition länger als der sichtbare Bereich, wird automatisch ein neues, darunterliegendes Piano-Roll-Raster für die Fortsetzung hinzugefügt.
    *   **Erweiterung des Tonumfangs**: Wird eine Note außerhalb des sichtbaren Oktavbereichs platziert (z.B. durch Verschieben), erweitert sich das Piano-Roll-Raster vertikal, um die neue Zeile für diese Note darzustellen.

### 3.3. Code-Beispiele (CSS-in-JS / Styled Components)

```typescript
// Beispiel für eine Button-Komponente mit Styled Components

import styled from 'styled-components';

interface NoteButtonProps {
  noteColor: string;
}

export const ControlButton = styled.button`
  background-color: #3c3c3c;
  border: 1px solid #555;
  border-radius: 5px;
  color: #d3d3d3;
  padding: 10px 15px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #4a4a4a;
  }
`;

export const PlayButton = styled(ControlButton)`
  background-color: #e67e22;

  &:hover {
    background-color: #f39c12;
  }
`;
```

## 4. Technische Spezifikation

### 4.1. Technologie-Stack

*   **Sprache**: TypeScript
*   **Frontend-Framework**: React
*   **Styling**: CSS-in-JS (z.B. Styled Components)
*   **Audio**: Tone.js
*   **State Management**: React Context oder Zustand

### 4.2. Datenstrukturen

Die Architektur ist für eine einzelne Spur (Single-Track) ausgelegt.

```typescript
// Typ-Definitionen für die Kern-Datenstrukturen

interface Note {
  id: string; // Eindeutige ID
  pitch: string; // z.B. "C4", "F#5"
  startTime: number; // Startzeit in Schlägen (z.B. 0, 0.5, 1)
  duration: number; // Dauer in Schlägen (z.B. 1 für eine Viertelnote)
}

interface Song {
  tempo: number; // in BPM
  meter: {
    beatsPerMeasure: number; // z.B. 4
    beatUnit: number; // z.B. 4 (für /4)
  };
  key: string; // z.B. "C Major"
  notes: Note[]; // Ein Array von Noten für die einzige Spur
}
```

### 4.3. Implementierungsdetails

*   **Audio-Engine-Service**: Ein separates Modul (`AudioEngine.ts`) kapselt die Interaktion mit `Tone.js`.
*   **UI-Komponenten**: Die Benutzeroberfläche wird in wiederverwendbare React-Komponenten aufgeteilt (`<TransportControls>`, `<PianoRoll>`, etc.).
*   **Zustandsverwaltung**: Der globale Zustand (`Song`-Objekt) wird zentral verwaltet, um eine konsistente Datenbasis für alle Komponenten zu gewährleisten.

### 4.4. Interaktionslogik

*   **Note-Dragging (Ripple-Drag)**: Die Drag-and-Drop-Logik für das Verschieben von Noten muss die Verschiebung aller nachfolgenden Noten berechnen.
    1.  `onDragStart`: Speichere die ID der gezogenen Note und ihre ursprüngliche `startTime`.
    2.  `onDrag`: Berechne das Delta der Zeitverschiebung.
    3.  `onDragEnd`: Aktualisiere die `startTime` der gezogenen Note und addiere das Zeit-Delta zu den `startTime`-Werten aller Noten, deren *ursprüngliche* Startzeit nach der der gezogenen Note lag.