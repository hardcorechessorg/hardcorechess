import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useNavigate } from 'react-router-dom';

const ComputerGame = () => {
  const navigate = useNavigate();
  const [game, setGame] = useState(new Chess());
  const [difficulty, setDifficulty] = useState(5);
  const [isGameOver, setIsGameOver] = useState(false);
  const [result, setResult] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [playerColor, setPlayerColor] = useState('w'); // w - белые, b - черные

  useEffect(() => {
    startNewGame();
  }, []);

  // Когда меняется цвет игрока, автоматически делаем ход компьютера если нужно
  useEffect(() => {
    if (playerColor === 'b' && game.turn() === 'w') {
      // Игрок выбрал черные, значит компьютер должен сделать первый ход белыми
      makeComputerMove();
    }
  }, [playerColor, game.turn()]);

  const startNewGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setIsGameOver(false);
    setResult(null);
    setIsThinking(false);
  };

  const makeComputerMove = async () => {
    if (game.isGameOver()) return;
    
    setIsThinking(true);
    
    try {
      // Сервер на Render, клиент на hardcorechess.org
      const response = await fetch('https://hardcorechess.onrender.com/stockfish-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fen: game.fen(), 
          difficulty: difficulty 
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        console.error('Ошибка Stockfish:', data.error);
        setIsThinking(false);
        return;
      }

      // Компьютер делает ход
      const computerMove = game.move(data.move);
      if (computerMove) {
        setGame(new Chess(game.fen()));
        
        // Проверяем, не окончена ли игра после хода компьютера
        if (game.isGameOver()) {
          setIsGameOver(true);
          if (game.isCheckmate()) {
            setResult(playerColor === 'w' ? 'Победа черных!' : 'Победа белых!');
          } else if (game.isDraw()) {
            setResult('Ничья!');
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при получении хода компьютера:', error);
    } finally {
      setIsThinking(false);
    }
  };

  const handleMove = async (sourceSquare, targetSquare) => {
    if (isGameOver || isThinking) return false;

    // Проверяем, чей ход
    if (game.turn() !== playerColor) return false;

    const move = game.move({ from: sourceSquare, to: targetSquare });
    if (!move) return false;

    // Обновляем состояние игры
    setGame(new Chess(game.fen()));
    
    // Проверяем, не окончена ли игра
    if (game.isGameOver()) {
      setIsGameOver(true);
      if (game.isCheckmate()) {
        setResult(playerColor === 'w' ? 'Победа белых!' : 'Победа черных!');
      } else if (game.isDraw()) {
        setResult('Ничья!');
      }
      return true;
    }

    // Если игра не окончена, ходит компьютер
    setTimeout(() => {
      makeComputerMove();
    }, 500); // Небольшая задержка для лучшего UX

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
      </div>
      
      <button onClick={startNewGame} className="button" style={{ marginBottom: 16 }}>
        Новая игра
      </button>
      
      {/* Информация о текущем состоянии */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <p className="kicker"><strong>Ход:</strong> {game.turn() === 'w' ? 'белых' : 'чёрных'}</p>
        {game.turn() === playerColor ? (
          <p className="kicker" style={{ color: '#81c784' }}>Ваш ход</p>
        ) : (
          <p className="kicker" style={{ color: '#8ab4f8' }}>
            {isThinking ? 'Компьютер думает…' : 'Ход компьютера'}
          </p>
        )}
      </div>
      
      {/* Шахматная доска */}
      <div className="board-wrap">
        <Chessboard
          position={game.fen()}
          onPieceDrop={handleMove}
          boardWidth={600}
          boardOrientation={playerColor === 'w' ? 'white' : 'black'}
        />
      </div>
      
      {/* Результат игры */}
      {isGameOver && (
        <div className="panel" style={{ marginTop: 16, color: '#ff8a80', fontWeight: 'bold' }}>
          {result}
        </div>
      )}
      
      {/* Индикатор загрузки */}
      {isThinking && (
        <div className="panel" style={{ marginTop: 16, color: '#8ab4f8' }}>
          Компьютер анализирует позицию…
        </div>
      )}
    </div>
  );
};

export default ComputerGame;
