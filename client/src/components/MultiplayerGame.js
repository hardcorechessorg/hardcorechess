import React, { useState, useEffect, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Chess } from 'chess.js';

const formatMs = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const pairMoves = (sans) => {
  const rows = [];
  for (let i = 0; i < sans.length; i += 2) {
    rows.push({ no: Math.floor(i / 2) + 1, w: sans[i] || '', b: sans[i + 1] || '' });
  }
  return rows;
};

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

  // time control
  const [minutes, setMinutes] = useState(5);
  const [increment, setIncrement] = useState(0);

  // auth token
  const [authToken, setAuthToken] = useState('');

  // local chess to compute SAN and history
  const [chess, setChess] = useState(() => new Chess());
  const [movesSan, setMovesSan] = useState([]);

  // live clock display
  const [clock, setClock] = useState({ wMs: 0, bMs: 0 });
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState('w');
  const [isGameOver, setIsGameOver] = useState(false);
  const [tick, setTick] = useState(0);

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
      const response = await fetch('https://hardcorechess.onrender.com/create-multiplayer-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes, increment })
      });
      const data = await response.json();
      
      setGameId(data.gameId);
      const joinLink = `${window.location.origin}/#/multiplayer?join=${data.gameId}`;
      setJoinUrl(joinLink);
      setGameState('creating');
      setError('');
      setClock(data.clock || { wMs: minutes * 60000, bMs: minutes * 60000 });
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

      setAuthToken(data.token || '');
      setGameData(data);
      setGameState('playing');
      connectWebSocket(gameId);
      setError('');

      // reset local chess from FEN
      const c = new Chess(data.fen);
      setChess(c);
      setMovesSan([]);
      setClock(data.clock || { wMs: (data.timeControl?.minutes || 5) * 60000, bMs: (data.timeControl?.minutes || 5) * 60000 });
      setLastSyncAt(Date.now());
      setCurrentPlayer(data.currentPlayer || 'w');
      setIsGameOver(false);
    } catch (err) {
      setError('Ошибка при присоединении к игре');
    }
  };

  const connectWebSocket = (gameId) => {
    const websocket = new WebSocket(`wss://hardcorechess.onrender.com?gameId=${gameId}`);
    
    websocket.onopen = () => {};
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'move') {
        try {
          const move = chess.move({ from: data.from, to: data.to });
          if (move) {
            setMovesSan(prev => [...prev, move.san]);
            setChess(new Chess(chess.fen()));
          }
        } catch {}
        setGameData(prev => ({
          ...prev,
          fen: data.fen,
          currentPlayer: data.currentPlayer,
          isGameOver: data.isGameOver,
          result: data.result
        }));
        if (data.clock) {
          setClock(data.clock);
          setLastSyncAt(Date.now());
        }
        setCurrentPlayer(data.currentPlayer);
        setIsGameOver(!!data.isGameOver);
      }
    };
    
    websocket.onerror = () => {};
    
    setWs(websocket);
  };

  const handleMove = async (sourceSquare, targetSquare) => {
    if (!gameData || gameData.isGameOver) return false;
    if (gameData.currentPlayer !== gameData.color) return false;

    try {
      const response = await fetch('https://hardcorechess.onrender.com/multiplayer-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          from: sourceSquare,
          to: targetSquare,
          playerColor: gameData.color,
          authToken
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return false;
      }

      try {
        const move = chess.move({ from: sourceSquare, to: targetSquare });
        if (move) {
          setMovesSan(prev => [...prev, move.san]);
          setChess(new Chess(chess.fen()));
        }
      } catch {}

      setGameData(prev => ({
        ...prev,
        fen: data.fen,
        currentPlayer: data.currentPlayer,
        isGameOver: data.isGameOver,
        result: data.result
      }));
      if (data.clock) {
        setClock(data.clock);
        setLastSyncAt(Date.now());
      }
      setCurrentPlayer(data.currentPlayer);
      setIsGameOver(!!data.isGameOver);

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

  // live ticking effect (forces rerender each 200ms)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(id);
  }, []);

  const displayedClock = useMemo(() => {
    if (!lastSyncAt || isGameOver) return clock;
    const now = Date.now();
    const elapsed = Math.max(0, now - lastSyncAt);
    if (currentPlayer === 'w') {
      return { wMs: Math.max(0, clock.wMs - elapsed), bMs: clock.bMs };
    } else {
      return { wMs: clock.wMs, bMs: Math.max(0, clock.bMs - elapsed) };
    }
  }, [clock, lastSyncAt, currentPlayer, isGameOver, tick]);

  useEffect(() => {
    return () => { if (ws) ws.close(); };
  }, [ws]);

  if (gameState === 'menu') {
    return (
      <div className="section">
        <button onClick={() => navigate('/')} className="button" style={{ marginBottom: 12 }}>Назад</button>
        <h2>Многопользовательская игра</h2>

        <div className="panel" style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label className="kicker">Минуты</label>
            <input type="number" min={1} max={180} value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              style={{ width: 80, padding: '8px', borderRadius: 6, border: '1px solid #3a3a3a', background: '#2a2a2a', color: '#e6e6e6' }} />
          </div>
          <div>
            <label className="kicker">Инкремент (сек)</label>
            <input type="number" min={0} max={60} value={increment}
              onChange={(e) => setIncrement(Number(e.target.value))}
              style={{ width: 120, padding: '8px', borderRadius: 6, border: '1px solid #3a3a3a', background: '#2a2a2a', color: '#e6e6e6' }} />
          </div>
          <button onClick={createNewGame} className="button primary">Создать игру</button>
        </div>

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
          <p className="kicker"><strong>Контроль времени:</strong> {minutes}+{increment}</p>
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
      </div>
    );
  }

  if (gameState === 'playing' && gameData) {
    const rows = pairMoves(movesSan);
    return (
      <div className="section" style={{ display: 'grid', gridTemplateColumns: 'minmax(600px, 1fr) 320px', gap: 16 }}>
        <div className="section"
     style={{ 
       display: 'grid', 
       gridTemplateColumns: 'minmax(600px, 1fr) 320px', 
       gap: 16,
       alignItems: 'center' 
     }}></div>
        <div>
          <button onClick={() => navigate('/')} className="button" style={{ marginBottom: 12 }}>Назад</button>
          <h2>Многопользовательская игра</h2>
          
          <div className="panel" style={{ marginBottom: 12 }}>
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
            <div className="panel" style={{ marginTop: 12, color: '#ff8a80', fontWeight: 'bold' }}>
              {gameData.result}
            </div>
          )}
          
          {error && (
            <div className="panel" style={{ marginTop: 12, color: '#ff8a80' }}>
              {error}
            </div>
          )}
        </div>

        {/* Правая колонка: часы и история ходов */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="panel" style={{ width: 280 }}>
            <h3 style={{ marginTop: 0 }}>Часы</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Белые</span>
                <strong>{formatMs(displayedClock.wMs)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Чёрные</span>
                <strong>{formatMs(displayedClock.bMs)}</strong>
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 12, width: 280, maxHeight: 520, overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>История ходов</h3>
            {rows.length === 0 ? (
              <p className="kicker">Пока нет ходов</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', width: 40 }}>#</th>
                    <th style={{ textAlign: 'left' }}>Белые</th>
                    <th style={{ textAlign: 'left' }}>Чёрные</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.no}>
                      <td>{r.no}.</td>
                      <td>{r.w}</td>
                      <td>{r.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MultiplayerGame;
