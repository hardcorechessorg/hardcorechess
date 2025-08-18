import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import GameModeSelector from './components/GameModeSelector';
import MultiplayerGame from './components/MultiplayerGame';
import ComputerGame from './components/ComputerGame';
import SinglePlayerGame from './components/SinglePlayerGame';
import SupportPage from './components/SupportPage';
import LegalPage from './components/LegalPage';

function App() {
  return (
    <Router>
      <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>♟ Hardcore Chess</h1>
          <nav style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>Главная</Link>
            <Link to="/multiplayer" style={{ textDecoration: 'none' }}>Мультиплеер</Link>
            <Link to="/computer" style={{ textDecoration: 'none' }}>С компьютером</Link>
            <Link to="/single" style={{ textDecoration: 'none' }}>Одиночная</Link>
            <Link to="/support" style={{ textDecoration: 'none', padding: '8px 14px', backgroundColor: '#4CAF50', color: 'white', borderRadius: 8 }}>Поддержать проект</Link>
            <Link to="/legal" style={{ textDecoration: 'none' }}>Оферта и контакты</Link>
          </nav>
        </div>
        <div style={{ height: 12 }} />
        <Routes>
          <Route path="/" element={<GameModeSelector />} />
          <Route path="/multiplayer" element={<MultiplayerGame />} />
          <Route path="/computer" element={<ComputerGame />} />
          <Route path="/single" element={<SinglePlayerGame />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
