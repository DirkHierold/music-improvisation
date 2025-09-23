import styled from 'styled-components';
import { GlobalStyles } from './styles/GlobalStyles';
import { TransportControls } from './components/TransportControls';
import { MusicalParameters } from './components/MusicalParameters';
import { DurationPanel } from './components/DurationPanel';
import { NoteButtons } from './components/NoteButtons';
import { PianoRoll } from './components/PianoRoll';

const AppContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #333;
  border-radius: 5px;
`;

const MiddleSection = styled.div`
  display: flex;
  gap: 20px;
  padding: 15px;
  background-color: #333;
  border-radius: 5px;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  gap: 20px;
  overflow: hidden;
`;

function App() {
  return (
    <>
      <GlobalStyles />
      <AppContainer>
        <TopBar>
          <TransportControls />
          <MusicalParameters />
        </TopBar>
        <MiddleSection>
          <NoteButtons />
        </MiddleSection>
        <MainContent>
          <DurationPanel />
          <PianoRoll />
        </MainContent>
      </AppContainer>
    </>
  );
}

export default App;