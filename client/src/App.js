import { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import GameModeSelector from "./components/GameModeSelector";
import MultiplayerGame from "./components/MultiplayerGame";
import ComputerGame from "./components/ComputerGame";
import SinglePlayerGame from "./components/SinglePlayerGame";

export default function App() {
  const [gameMode, setGameMode] = useState(null);
  const [gameData, setGameData] = useState(null);

  const handleGameModeSelect = (mode, data = null) => {
    setGameMode(mode);
    setGameData(data);
  };

  const handleBackToMenu = () => {
    setGameMode(null);
    setGameData(null);
  };

  const renderGameComponent = () => {
    switch (gameMode) {
      case 'multiplayer':
        return <MultiplayerGame gameData={gameData} onBack={handleBackToMenu} />;
      case 'computer':
        return <ComputerGame onBack={handleBackToMenu} />;
      case 'single':
        return <SinglePlayerGame onBack={handleBackToMenu} />;
      default:
        return <GameModeSelector onSelect={handleGameModeSelect} />;
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>♟ Hardcore Chess</h1>
      {renderGameComponent()}
    </div>
  );
}
