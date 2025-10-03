import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const [isStockfishReady, setIsStockfishReady] = useState(false);
  const [isLoadingStockfish, setIsLoadingStockfish] = useState(true);
  const stockfishRef = useRef(null);

  // Контроль времени
  const [minutes, setMinutes] = useState(5);
  const [increment, setIncrement] = useState(0);
  const [clock, setClock] = useState({ wMs: minutes * 60000, bMs: minutes * 60000 });
  const [lastTurnStartAt, setLastTurnStartAt] = useState(null);
  const [tick, setTick] = useState(0);

  // История ходов (SAN)
  const [movesSan, setMovesSan] = useState([]);

  // Инициализация Stockfish (упрощенная версия как в Lichess)
  useEffect(() => {
    const initStockfish = async () => {
      try {
        setIsLoadingStockfish(true);
        
        // Определяем путь к Stockfish для продакшна
        const getStockfishPath = () => {
          // В продакшне файлы находятся на hardcorechess.org
          if (window.location.hostname === 'www.hardcorechess.org') {
            return 'https://www.hardcorechess.org/stockfish-nnue-16-single.js';
          }
          // Локально используем относительный путь
          return '/stockfish-nnue-16-single.js';
        };

        // Простая реализация с fallback на CDN
        const loadStockfish = () => {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            let attempts = 0;
            const maxAttempts = 2;
            
            const tryLoad = () => {
              if (attempts === 0) {
                // Первая попытка - локальный файл или файл с продакшн сервера
                script.src = getStockfishPath();
                console.log('Попытка загрузки Stockfish с:', script.src);
              } else if (attempts === 1) {
                // Вторая попытка - CDN
                script.src = 'https://unpkg.com/stockfish@16.0.0/src/stockfish-nnue-16-single.js';
                console.log('Попытка загрузки Stockfish с CDN:', script.src);
              } else {
                console.log('Все попытки загрузки исчерпаны');
                reject(new Error('Stockfish не загружен'));
                return;
              }
              
              attempts++;
              document.head.appendChild(script);
            };
            
            script.onload = () => {
              console.log('Stockfish скрипт загружен успешно');
              resolve();
            };
            
            script.onerror = () => {
              console.log(`Ошибка загрузки Stockfish (попытка ${attempts})`);
              script.remove(); // Удаляем неудачный скрипт
              tryLoad(); // Пробуем следующий источник
            };
            
            tryLoad();
          });
        };
        
        try {
          await loadStockfish();
          
          // Ждем инициализации
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (window.Stockfish) {
            const stockfish = new window.Stockfish();
            stockfishRef.current = stockfish;
            
            stockfish.onmessage = (event) => {
              const message = event.data || event;
              if (message.includes('uciok')) {
                console.log('Stockfish готов к работе');
                setIsStockfishReady(true);
                setIsLoadingStockfish(false);
              }
            };
            
            stockfish.postMessage('uci');
          } else {
            throw new Error('Stockfish не найден в window');
          }
        } catch (error) {
          console.log('Stockfish недоступен, используем простой ИИ');
          setIsLoadingStockfish(false);
        }
      } catch (error) {
        console.error('Ошибка инициализации:', error);
        setIsLoadingStockfish(false);
      }
    };
    
    initStockfish();
    
    return () => {
      if (stockfishRef.current) {
        stockfishRef.current.terminate();
      }
    };
  }, []);

  useEffect(() => {
    if (isStockfishReady) {
      startNewGame();
    }
  }, [isStockfishReady]);

  useEffect(() => {
    if (!isGameOver && playerColor === 'b' && game.turn() === 'w') {
      makeComputerMove();
    }
  }, [playerColor]);

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
    if (playerColor === 'b') {
      setTimeout(() => makeComputerMove(), 50);
    }
  };

  const finishOnTime = (loser) => {
    setIsGameOver(true);
    setResult(loser === 'w' ? 'Поражение по времени (белые)' : 'Поражение по времени (чёрные)');
  };

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

  const makeSimpleComputerMove = () => {
    if (isGameOver || game.isGameOver()) return;
    
    setIsThinking(true);
    
    setTimeout(() => {
      try {
        const moves = game.moves();
        if (moves.length > 0) {
          // Простой алгоритм: случайный ход с небольшим приоритетом для взятий
          const captures = moves.filter(move => {
            const testGame = new Chess(game.fen());
            const moveObj = testGame.move(move);
            return moveObj && moveObj.captured;
          });
          
          const moveToPlay = captures.length > 0 && Math.random() < 0.7 
            ? captures[Math.floor(Math.random() * captures.length)]
            : moves[Math.floor(Math.random() * moves.length)];
          
          const move = game.move(moveToPlay);
          if (move) {
            setMovesSan(prev => [...prev, move.san]);
            setGame(new Chess(game.fen()));
            const compColor = move.color;
            if (!settleTimeAfterMove(compColor)) {
              setIsThinking(false);
              return;
            }

            if (game.isGameOver()) {
              setIsGameOver(true);
              if (game.isCheckmate()) {
                setResult(playerColor === 'w' ? 'Победа чёрных!' : 'Победа белых!');
              } else if (game.isDraw()) {
                setResult('Ничья!');
              }
            }
          }
        }
      } catch (error) {
        console.error('Ошибка простого хода:', error);
      } finally {
        setIsThinking(false);
      }
    }, 500 + Math.random() * 1000); // Имитация размышления
  };

  const makeComputerMove = async () => {
    try {
      if (isGameOver || game.isGameOver()) return;
      
      // Если Stockfish не готов, используем простой алгоритм
      if (!isStockfishReady || !stockfishRef.current) {
        makeSimpleComputerMove();
        return;
      }

      if (game.turn() !== playerColor) {
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
      
      return new Promise((resolve) => {
        const stockfish = stockfishRef.current;
        let bestMove = null;
        let resolved = false;
        
        // Таймаут для Stockfish (максимум 3 секунды)
        const timeout = setTimeout(() => {
          if (!resolved) {
            console.log('Stockfish timeout, используем простой алгоритм');
            makeSimpleComputerMove();
            resolve();
          }
        }, 3000);
        
        const handleMessage = (event) => {
          const message = event.data || event;
          
          if (message.includes('bestmove')) {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeout);
            
            const parts = message.split(' ');
            if (parts.length >= 2) {
              bestMove = parts[1];
            }
            
            if (bestMove && bestMove !== 'null') {
              try {
                const move = game.move(bestMove);
                if (move) {
                  setMovesSan(prev => [...prev, move.san]);
                  setGame(new Chess(game.fen()));
                  const compColor = move.color;
                  if (!settleTimeAfterMove(compColor)) {
                    setIsThinking(false);
                    resolve();
                    return;
                  }

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
                console.error('Ошибка выполнения хода:', error);
              }
            }
            
            setIsThinking(false);
            resolve();
          }
        };
        
        stockfish.onmessage = handleMessage;
        
        // Настройка сложности (упрощенная версия)
        const depth = difficulty >= 7 ? 6 : difficulty >= 4 ? 4 : 2;
        const skillLevel = Math.min(20, difficulty * 2);
        
        stockfish.postMessage('setoption name Skill Level value ' + skillLevel);
        stockfish.postMessage('position fen ' + game.fen());
        stockfish.postMessage('go depth ' + depth);
      });
    } catch (error) {
      console.error('Ошибка в makeComputerMove:', error);
      setIsThinking(false);
    }
  };

  const handleMove = async (sourceSquare, targetSquare) => {
    try {
      if (isGameOver || isThinking) return false;
      if (game.turn() !== playerColor) return false;

      const move = game.move({ from: sourceSquare, to: targetSquare });
      if (!move) return false;

      setMovesSan(prev => [...prev, move.san]);
      setGame(new Chess(game.fen()));

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
    } catch (error) {
      // Просто возвращаем false, фигура вернется на место
      console.log('Неправильный ход:', error.message);
      return false;
    }
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
    <div className="section">
      <button 
        onClick={() => navigate('/')}
        className="button"
        style={{ marginBottom: 12 }}
      >
        Назад
      </button>
      
      <h2>Игра против компьютера</h2>

      {isLoadingStockfish && (
        <div className="panel" style={{ marginBottom: 16, color: '#8ab4f8' }}>
          Загрузка легкой версии Stockfish...
          <br />
          <small>Сервер: hardcorechess.onrender.com | Клиент: hardcorechess.org</small>
        </div>
      )}

      {isStockfishReady && (
        <div className="panel" style={{ marginBottom: 16, color: '#4caf50' }}>
          ✅ Stockfish готов! Компьютер будет играть на максимальном уровне.
        </div>
      )}

      {!isStockfishReady && !isLoadingStockfish && (
        <div className="panel" style={{ marginBottom: 16, color: '#ffa726' }}>
          ⚠️ Stockfish не загружен. Используется упрощенный ИИ.
          <br />
          <small>Игра будет работать, но компьютер будет играть проще.</small>
          <br />
          <small>Откройте консоль браузера (F12) для диагностики.</small>
          <br />
          <small>На продакшн сервере Stockfish должен работать лучше.</small>
        </div>
      )}

      <div className="game-layout">
        <div className="game-board">
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
          
          <div className="board-responsive">
            <Chessboard
              position={game.fen()}
              onPieceDrop={handleMove}
              boardWidth={650}
              boardOrientation={playerColor === 'w' ? 'white' : 'black'}
            />
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

        <div className="game-sidebar">
          <div className="panel game-clock">
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

          <div className="panel game-history">
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
    </div>
  );
};

export default ComputerGame;
