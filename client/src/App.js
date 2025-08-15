import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import GameModeSelector from './components/GameModeSelector';
import MultiplayerGame from './components/MultiplayerGame';
import ComputerGame from './components/ComputerGame';
import SinglePlayerGame from './components/SinglePlayerGame';

function App() {
  return (
    <Router>
      <div style={{ padding: 20 }}>
        <h1>♟ Hardcore Chess</h1>
        <Routes>
          <Route path="/" element={<GameModeSelector />} />
          <Route path="/multiplayer" element={<MultiplayerGame />} />
          <Route path="/computer" element={<ComputerGame />} />
          <Route path="/single" element={<SinglePlayerGame />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
