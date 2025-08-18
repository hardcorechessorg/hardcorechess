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
    // Можно добавить уведомление об успешном копировании
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
      <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            padding: '10px 20px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          ← Назад
        </button>
        
        <h2>🎮 Многопользовательская игра</h2>
        
        <div style={{ marginTop: '30px' }}>
          <button
            onClick={createNewGame}
            style={{
              padding: '15px 30px',
              fontSize: '1.2em',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              margin: '10px',
              width: '200px'
            }}
          >
            Создать игру
          </button>
          
          <div style={{ margin: '20px 0', fontSize: '1.1em' }}>
            или
          </div>
          
          <div style={{ marginTop: '20px' }}>
            <input
              type="text"
              placeholder="ID игры"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              style={{
                padding: '12px',
                fontSize: '1em',
                width: '200px',
                margin: '5px',
                borderRadius: '5px',
                border: '1px solid #ddd'
              }}
            />
            <br />
            <input
              type="text"
              placeholder="Ваше имя"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={{
                padding: '12px',
                fontSize: '1em',
                width: '200px',
                margin: '5px',
                borderRadius: '5px',
                border: '1px solid #ddd'
              }}
            />
            <br />
            <button
              onClick={joinGame}
              style={{
                padding: '12px 25px',
                fontSize: '1em',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                margin: '10px',
                width: '200px'
              }}
            >
              Присоединиться
            </button>
          </div>
        </div>
        
        {error && (
          <div style={{ color: 'red', marginTop: '20px' }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  if (gameState === 'joining') {
    return (
      <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            padding: '10px 20px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          ← Назад
        </button>
        
        <h2>🎮 Присоединиться к игре</h2>
        
        <div style={{ 
          backgroundColor: '#e3f2fd', 
          padding: '20px', 
          borderRadius: '10px',
          margin: '20px 0'
        }}>
          <p><strong>ID игры:</strong> {gameId}</p>
          <p>Введите ваше имя, чтобы присоединиться к игре.</p>
        </div>
        
        <div style={{ marginTop: '30px' }}>
          <input
            type="text"
            placeholder="Ваше имя"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{
              padding: '12px',
              fontSize: '1em',
              width: '200px',
              margin: '5px',
              borderRadius: '5px',
              border: '1px solid #ddd'
            }}
          />
          <br />
          <button
            onClick={joinGame}
            style={{
              padding: '12px 25px',
              fontSize: '1em',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              margin: '10px',
              width: '200px'
            }}
          >
            Присоединиться к игре
          </button>
        </div>
        
        {error && (
          <div style={{ color: 'red', marginTop: '20px' }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  if (gameState === 'creating') {
    return (
      <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            padding: '10px 20px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          ← Назад
        </button>
        
        <h2>🎮 Игра создана!</h2>
        
        <div style={{ 
          backgroundColor: '#f0f0f0', 
          padding: '20px', 
          borderRadius: '10px',
          margin: '20px 0'
        }}>
          <p><strong>ID игры:</strong> {gameId}</p>
          <p><strong>Ссылка для друга:</strong></p>
          <input
            type="text"
            value={joinUrl}
            readOnly
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '1em',
              border: '1px solid #ddd',
              borderRadius: '5px',
              backgroundColor: 'white'
            }}
          />
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={copyToClipboard}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Копировать ссылку
            </button>
            <button
              onClick={openGameInNewTab}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Открыть в новой вкладке
            </button>
          </div>
        </div>
        
        <p>Отправьте эту ссылку другу, чтобы он мог присоединиться к игре.</p>
        <p>Ожидание второго игрока...</p>
        
        <div style={{ marginTop: '30px' }}>
          <input
            type="text"
            placeholder="Ваше имя"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{
              padding: '12px',
              fontSize: '1em',
              width: '200px',
              margin: '5px',
              borderRadius: '5px',
              border: '1px solid #ddd'
            }}
          />
          <br />
          <button
            onClick={joinGame}
            style={{
              padding: '12px 25px',
              fontSize: '1em',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              margin: '10px',
              width: '200px'
            }}
          >
            Присоединиться как создатель
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'playing' && gameData) {
    return (
      <div style={{ textAlign: 'center' }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            padding: '10px 20px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          ← Назад
        </button>
        
        <h2>🎮 Многопользовательская игра</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <p><strong>Игра:</strong> {gameId}</p>
          <p><strong>Вы играете:</strong> {gameData.color === 'w' ? 'белыми' : 'черными'}</p>
          <p><strong>Ход:</strong> {gameData.currentPlayer === 'w' ? 'белых' : 'черных'}</p>
          {gameData.currentPlayer === gameData.color && (
            <p style={{ color: '#4CAF50', fontWeight: 'bold' }}>Ваш ход!</p>
          )}
        </div>
        
        <Chessboard
          position={gameData.fen}
          onPieceDrop={handleMove}
          boardWidth={600}
          boardOrientation={gameData.color === 'w' ? 'white' : 'black'}
        />
        
        {gameData.isGameOver && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px',
            backgroundColor: '#ffebee',
            borderRadius: '10px',
            color: '#c62828',
            fontWeight: 'bold',
            fontSize: '1.2em'
          }}>
            {gameData.result}
          </div>
        )}
        
        {error && (
          <div style={{ color: 'red', marginTop: '20px' }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default MultiplayerGame;
