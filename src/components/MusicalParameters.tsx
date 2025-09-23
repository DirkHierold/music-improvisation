import styled from 'styled-components';
import { useStore } from '../store';

const Container = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
`;

const Parameter = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.div`
  font-size: 12px;
  color: #888;
`;

const Value = styled.input`
  background-color: #3c3c3c;
  border: 1px solid #555;
  border-radius: 3px;
  color: #d3d3d3;
  padding: 5px 10px;
  font-size: 14px;
  width: 80px;
`;

const Select = styled.select`
  background-color: #3c3c3c;
  border: 1px solid #555;
  border-radius: 3px;
  color: #d3d3d3;
  padding: 5px 10px;
  font-size: 14px;
`;

export function MusicalParameters() {
  const { song, setTempo, setMeter, setKey } = useStore();

  return (
    <Container>
      <Parameter>
        <Label>Beats</Label>
        <Value
          type="number"
          value={song.meter.beatsPerMeasure}
          onChange={(e) => setMeter(parseInt(e.target.value))}
          min={1}
          max={16}
        />
      </Parameter>
      <Parameter>
        <Label>Key</Label>
        <Select value={song.key} onChange={(e) => setKey(e.target.value)}>
          <option>C Major</option>
          <option>G Major</option>
          <option>D Major</option>
          <option>A Major</option>
          <option>E Major</option>
          <option>B Major</option>
          <option>F Major</option>
          <option>Bb Major</option>
          <option>Eb Major</option>
          <option>Ab Major</option>
          <option>Db Major</option>
          <option>Gb Major</option>
        </Select>
      </Parameter>
      <Parameter>
        <Label>Tempo</Label>
        <Value
          type="number"
          value={song.tempo}
          onChange={(e) => setTempo(parseInt(e.target.value))}
          min={40}
          max={240}
        />
      </Parameter>
    </Container>
  );
}