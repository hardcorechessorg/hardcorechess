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
      <div className="app-container">
        <div className="header">
          <h1 className="brand">Hardcore Chess</h1>
          <nav className="nav">
            <Link to="/">Главная</Link>
            <Link to="/multiplayer">Мультиплеер</Link>
            <Link to="/computer">С компьютером</Link>
            <Link to="/single">Одиночная</Link>
            <Link to="/support" className="cta">Поддержать проект</Link>
            <Link to="/legal">Оферта и контакты</Link>
          </nav>
        </div>
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
