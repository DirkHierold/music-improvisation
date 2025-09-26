import styled from 'styled-components';
import { GlobalStyles } from './styles/GlobalStyles';
import { TransportControls } from './components/TransportControls';
import { MusicalParameters } from './components/MusicalParameters';
import { DurationPanel } from './components/DurationPanel';
import { NoteButtons } from './components/NoteButtons';
import { PianoRoll } from './components/PianoRoll';
import { SaveLoadButtons } from './components/SaveLoadButtons';
import { UkuleleRoll } from './components/UkuleleRoll';
import { useStore } from './store';

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
  flex-wrap: wrap;
  gap: 15px;
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
  const { isPracticeMode } = useStore();

  return (
    <>
      <GlobalStyles />
      <AppContainer>
        <TopBar>
          <TransportControls />
          <MusicalParameters />
          <SaveLoadButtons />
        </TopBar>
        {isPracticeMode ? (
          <MainContent>
            <UkuleleRoll />
          </MainContent>
        ) : (
          <>
            <MiddleSection>
              <NoteButtons />
            </MiddleSection>
            <MainContent>
              <DurationPanel />
              <PianoRoll />
            </MainContent>
          </>
        )}
      </AppContainer>
    </>
  );
}

export default App;