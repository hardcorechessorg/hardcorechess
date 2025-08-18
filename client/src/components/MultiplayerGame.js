import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { useNavigate, useSearchParams } from 'react-router-dom';

const MultiplayerGame = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [gameId, setGameId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState('menu'); // menu, creating, joining, playing
  const [gameData, setGameData] = useState(null);
  const [joinUrl, setJoinUrl] = useState('');
  const [error, setError] = useState('');
  const [ws, setWs] = useState(null);

  // Проверяем, есть ли параметр join в URL
  useEffect(() => {
    const joinGameId = searchParams.get('join');
    if (joinGameId) {
      setGameId(joinGameId);
      setGameState('joining');
    }
  }, [searchParams]);

  const createNewGame = async () => {
    try {
      // Сервер на Render, клиент на hardcorechess.org
      const response = await fetch('https://hardcorechess.onrender.com/create-multiplayer-game', {
        method: 'POST'
      });
      const data = await response.json();
      
      setGameId(data.gameId);
      // Создаем правильную ссылку для присоединения с HashRouter
      const joinLink = `${window.location.origin}/#/multiplayer?join=${data.gameId}`;
      setJoinUrl(joinLink);
      setGameState('creating');
      setError('');
    } catch (err) {
      setError('Ошибка при создании игры');
    }
  };

  const joinGame = async () => {
    if (!gameId || !playerName) {
      setError('Введите ID игры и ваше имя');
      return;
    }

    try {
      const response = await fetch('https://hardcorechess.onrender.com/join-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerName })
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }

      setGameData(data);
      setGameState('playing');
      connectWebSocket(gameId);
      setError('');
    } catch (err) {
      setError('Ошибка при присоединении к игре');
    }
  };

  const connectWebSocket = (gameId) => {
    // WebSocket к серверу на Render
    const websocket = new WebSocket(`wss://hardcorechess.onrender.com?gameId=${gameId}`);
    
    websocket.onopen = () => {
      console.log('WebSocket соединение установлено');
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'move') {
        setGameData(prev => ({
          ...prev,
          fen: data.fen,
          currentPlayer: data.currentPlayer,
          isGameOver: data.isGameOver,
          result: data.result
        }));
      }
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket ошибка:', error);
    };
    
    setWs(websocket);
  };

  const handleMove = async (sourceSquare, targetSquare) => {
    if (!gameData || gameData.isGameOver) return false;
    
    // Проверяем, чей ход
    if (gameData.currentPlayer !== gameData.color) {
      return false; // Не ваш ход
    }

    try {
      const response = await fetch('https://hardcorechess.onrender.com/multiplayer-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          from: sourceSquare,
          to: targetSquare,
          playerColor: gameData.color
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return false;
      }

      setGameData(prev => ({
        ...prev,
        fen: data.fen,
        currentPlayer: data.currentPlayer,
        isGameOver: data.isGameOver,
        result: data.result
      }));

      return true;
    } catch (err) {
      setError('Ошибка при выполнении хода');
      return false;
    }
  };

  const openGameInNewTab = () => {
    window.open(joinUrl, '_blank');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(joinUrl);
  };

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  if (gameState === 'menu') {
    return (
      <div className="section">
        <button onClick={() => navigate('/')} className="button" style={{ marginBottom: 12 }}>Назад</button>
        <h2>Многопользовательская игра</h2>
        
        <div style={{ marginTop: 16 }}>
          <button onClick={createNewGame} className="button primary">Создать игру</button>
          <div className="section">
            <input
              type="text"
              placeholder="ID игры"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              style={{
                padding: '10px 12px',
                width: 220,
                marginRight: 8,
                borderRadius: 6,
                border: '1px solid #3a3a3a',
                background: '#2a2a2a',
                color: '#e6e6e6'
              }}
            />
            <input
              type="text"
              placeholder="Ваше имя"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={{
                padding: '10px 12px',
                width: 220,
                marginRight: 8,
                borderRadius: 6,
                border: '1px solid #3a3a3a',
                background: '#2a2a2a',
                color: '#e6e6e6'
              }}
            />
            <button onClick={joinGame} className="button">Присоединиться</button>
          </div>
        </div>
        
        {error && (
          <div className="panel" style={{ marginTop: 16, color: '#ff8a80' }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  if (gameState === 'joining') {
    return (
      <div className="section">
        <button onClick={() => navigate('/')} className="button" style={{ marginBottom: 12 }}>Назад</button>
        <h2>Присоединиться к игре</h2>
        
        <div className="panel" style={{ marginTop: 16 }}>
          <p className="kicker"><strong>ID игры:</strong> {gameId}</p>
          <p className="kicker">Введите ваше имя, чтобы присоединиться к игре.</p>
        </div>
        
        <div className="section">
          <input
            type="text"
            placeholder="Ваше имя"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{
              padding: '10px 12px',
              width: 220,
              marginRight: 8,
              borderRadius: 6,
              border: '1px solid #3a3a3a',
              background: '#2a2a2a',
              color: '#e6e6e6'
            }}
          />
          <button onClick={joinGame} className="button">Присоединиться к игре</button>
        </div>
        
        {error && (
          <div className="panel" style={{ marginTop: 16, color: '#ff8a80' }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  if (gameState === 'creating') {
    return (
      <div className="section">
        <button onClick={() => navigate('/')} className="button" style={{ marginBottom: 12 }}>Назад</button>
        <h2>Игра создана</h2>
        
        <div className="panel" style={{ marginTop: 16 }}>
          <p className="kicker"><strong>ID игры:</strong> {gameId}</p>
          <p className="kicker"><strong>Ссылка для друга:</strong></p>
          <input
            type="text"
            value={joinUrl}
            readOnly
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #3a3a3a',
              background: '#2a2a2a',
              color: '#e6e6e6'
            }}
          />
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={copyToClipboard} className="button">Копировать ссылку</button>
            <button onClick={openGameInNewTab} className="button info">Открыть в новой вкладке</button>
          </div>
        </div>
        
        <div className="section">
          <input
            type="text"
            placeholder="Ваше имя"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{
              padding: '10px 12px',
              width: 220,
              marginRight: 8,
              borderRadius: 6,
              border: '1px solid #3a3a3a',
              background: '#2a2a2a',
              color: '#e6e6e6'
            }}
          />
          <button onClick={joinGame} className="button">Присоединиться как создатель</button>
        </div>
      </div>
    );
  }

  if (gameState === 'playing' && gameData) {
    return (
      <div className="section">
        <button onClick={() => navigate('/')} className="button" style={{ marginBottom: 12 }}>Назад</button>
        <h2>Многопользовательская игра</h2>
        
        <div className="panel" style={{ marginBottom: 16 }}>
          <p className="kicker"><strong>Игра:</strong> {gameId}</p>
          <p className="kicker"><strong>Вы играете:</strong> {gameData.color === 'w' ? 'белыми' : 'чёрными'}</p>
          <p className="kicker"><strong>Ход:</strong> {gameData.currentPlayer === 'w' ? 'белых' : 'чёрных'}</p>
        </div>
        
        <div className="board-wrap">
          <Chessboard
            position={gameData.fen}
            onPieceDrop={handleMove}
            boardWidth={600}
            boardOrientation={gameData.color === 'w' ? 'white' : 'black'}
          />
        </div>
        
        {gameData.isGameOver && (
          <div className="panel" style={{ marginTop: 16, color: '#ff8a80', fontWeight: 'bold' }}>
            {gameData.result}
          </div>
        )}
        
        {error && (
          <div className="panel" style={{ marginTop: 16, color: '#ff8a80' }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default MultiplayerGame;
