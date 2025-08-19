import React, { useState, useEffect, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useNavigate } from 'react-router-dom';

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

const ComputerGame = () => {
  const navigate = useNavigate();
  const [game, setGame] = useState(new Chess());
  const [difficulty, setDifficulty] = useState(5);
  const [isGameOver, setIsGameOver] = useState(false);
  const [result, setResult] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [playerColor, setPlayerColor] = useState('w'); // w - белые, b - черные

  // Контроль времени
  const [minutes, setMinutes] = useState(5);
  const [increment, setIncrement] = useState(0);
  const [clock, setClock] = useState({ wMs: minutes * 60000, bMs: minutes * 60000 });
  const [lastTurnStartAt, setLastTurnStartAt] = useState(null);
  const [tick, setTick] = useState(0);

  // История ходов (SAN)
  const [movesSan, setMovesSan] = useState([]);

  useEffect(() => {
    startNewGame();
  }, []);

  // Когда меняется цвет игрока, если компьютер ходит первым — сделать ход
  useEffect(() => {
    if (!isGameOver && playerColor === 'b' && game.turn() === 'w') {
      makeComputerMove();
    }
  }, [playerColor]);

  // Тикер для часов (каждые 200мс)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 200);
    return () => clearInterval(id);
  }, []);

  const displayedClock = useMemo(() => {
    if (isGameOver || lastTurnStartAt == null) return clock;
    const now = Date.now();
    const elapsed = Math.max(0, now - lastTurnStartAt);
    if (game.turn() === 'w') {
      return { wMs: Math.max(0, clock.wMs - elapsed), bMs: clock.bMs };
    } else {
      return { wMs: clock.wMs, bMs: Math.max(0, clock.bMs - elapsed) };
    }
  }, [clock, lastTurnStartAt, isGameOver, game, tick]);

  const resetClocks = (mins, inc) => {
    const ms = mins * 60000;
    setClock({ wMs: ms, bMs: ms });
    setLastTurnStartAt(Date.now());
  };

  const startNewGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setIsGameOver(false);
    setResult(null);
    setIsThinking(false);
    setMovesSan([]);
    resetClocks(minutes, increment);
    // Если игрок выбирает чёрных — компьютер начинает
    if (playerColor === 'b') {
      setTimeout(() => makeComputerMove(), 50);
    }
  };

  const finishOnTime = (loser) => {
    setIsGameOver(true);
    setResult(loser === 'w' ? 'Поражение по времени (белые)' : 'Поражение по времени (чёрные)');
  };

  // Списать время текущего игрока и добавить инкремент сделавшему ход
  const settleTimeAfterMove = (movedColor) => {
    const now = Date.now();
    if (lastTurnStartAt != null) {
      const elapsed = now - lastTurnStartAt;
      if (movedColor === 'w') {
        const newW = Math.max(0, clock.wMs - elapsed) + increment * 1000;
        if (newW <= 0) { finishOnTime('w'); return false; }
        setClock({ wMs: newW, bMs: clock.bMs });
      } else {
        const newB = Math.max(0, clock.bMs - elapsed) + increment * 1000;
        if (newB <= 0) { finishOnTime('b'); return false; }
        setClock({ wMs: clock.wMs, bMs: newB });
      }
    }
    setLastTurnStartAt(now);
    return true;
  };

  const makeComputerMove = async () => {
    if (isGameOver || game.isGameOver()) return;

    // Перед ходом компьютера — если его очередь, проверим просрочку
    if (game.turn() !== playerColor) {
      // Текущий — компьютер
      const now = Date.now();
      if (lastTurnStartAt != null) {
        const elapsed = now - lastTurnStartAt;
        const compColor = playerColor === 'w' ? 'b' : 'w';
        const compMs = compColor === 'w' ? clock.wMs : clock.bMs;
        if (compMs - elapsed <= 0) {
          finishOnTime(compColor);
          return;
        }
      }
    }

    setIsThinking(true);
    try {
      const response = await fetch('https://hardcorechess.onrender.com/stockfish-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fen: game.fen(), 
          difficulty: difficulty 
        })
      });
      const data = await response.json();
      if (data.error) { setIsThinking(false); return; }

      const move = game.move(data.move);
      if (move) {
        setMovesSan(prev => [...prev, move.san]);
        setGame(new Chess(game.fen()));
        // Списываем время компьютера и добавляем инкремент
        const compColor = move.color; // цвет сделавшего ход ('w' или 'b')
        if (!settleTimeAfterMove(compColor)) return;

        if (game.isGameOver()) {
          setIsGameOver(true);
          if (game.isCheckmate()) {
            setResult(playerColor === 'w' ? 'Победа чёрных!' : 'Победа белых!');
          } else if (game.isDraw()) {
            setResult('Ничья!');
          }
        }
      }
    } catch (error) {
      // ignore
    } finally {
      setIsThinking(false);
    }
  };

  const handleMove = async (sourceSquare, targetSquare) => {
    if (isGameOver || isThinking) return false;
    if (game.turn() !== playerColor) return false;

    const move = game.move({ from: sourceSquare, to: targetSquare });
    if (!move) return false;

    setMovesSan(prev => [...prev, move.san]);
    setGame(new Chess(game.fen()));

    // Списываем время игрока и добавляем инкремент
    if (!settleTimeAfterMove(move.color)) return true;

    if (game.isGameOver()) {
      setIsGameOver(true);
      if (game.isCheckmate()) {
        setResult(playerColor === 'w' ? 'Победа белых!' : 'Победа чёрных!');
      } else if (game.isDraw()) {
        setResult('Ничья!');
      }
      return true;
    }

    setTimeout(() => { makeComputerMove(); }, 200);
    return true;
  };

  const changeDifficulty = (newDifficulty) => {
    setDifficulty(newDifficulty);
    startNewGame();
  };

  const changePlayerColor = (color) => {
    setPlayerColor(color);
    startNewGame();
  };

  const rows = useMemo(() => pairMoves(movesSan), [movesSan]);

  return (
    <div className="section" style={{ display: 'grid', gridTemplateColumns: 'minmax(600px, 1fr) 320px', gap: 16 }}>
      <div>
        <button 
          onClick={() => navigate('/')}
          className="button"
          style={{ marginBottom: 12 }}
        >
          Назад
        </button>
        
        <h2>Игра против компьютера</h2>
        
        {/* Настройки игры */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="panel">
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>
              Сложность: {difficulty}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={difficulty}
              onChange={(e) => changeDifficulty(parseInt(e.target.value))}
              style={{ width: 180 }}
            />
          </div>
          
          <div className="panel">
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>
              Цвет фигур:
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => changePlayerColor('w')}
                className={`button ${playerColor === 'w' ? 'primary' : ''}`}
              >
                Белые
              </button>
              <button
                onClick={() => changePlayerColor('b')}
                className={`button ${playerColor === 'b' ? 'primary' : ''}`}
              >
                Чёрные
              </button>
            </div>
          </div>

          <div className="panel">
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Контроль времени</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" min={1} max={180} value={minutes}
                onChange={(e) => { setMinutes(Number(e.target.value)); resetClocks(Number(e.target.value), increment); }}
                style={{ width: 80, padding: '8px', borderRadius: 6, border: '1px solid #3a3a3a', background: '#2a2a2a', color: '#e6e6e6' }} />
              <span className="kicker">+</span>
              <input type="number" min={0} max={60} value={increment}
                onChange={(e) => { setIncrement(Number(e.target.value)); }}
                style={{ width: 100, padding: '8px', borderRadius: 6, border: '1px solid #3a3a3a', background: '#2a2a2a', color: '#e6e6e6' }} />
              <span className="kicker">сек</span>
            </div>
          </div>
        </div>
        
        <button onClick={startNewGame} className="button" style={{ marginBottom: 12 }}>
          Новая игра
        </button>
        
        {/* Доска */}
        <div className="board-wrap">
          <Chessboard
            position={game.fen()}
            onPieceDrop={handleMove}
            boardWidth={600}
            boardOrientation={playerColor === 'w' ? 'white' : 'black'}
          />
        </div>

        {/* Часы под доской */}
        <div className="panel" style={{ marginTop: 12 }}>
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

        {isGameOver && (
          <div className="panel" style={{ marginTop: 12, color: '#ff8a80', fontWeight: 'bold' }}>
            {result}
          </div>
        )}
        
        {isThinking && (
          <div className="panel" style={{ marginTop: 12, color: '#8ab4f8' }}>
            Компьютер анализирует позицию…
          </div>
        )}
      </div>

      {/* История ходов справа */}
      <div>
        <div className="panel" style={{ maxHeight: 520, overflow: 'auto' }}>
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
};

export default ComputerGame;
