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
      
      <h2>🤖 Игра против компьютера</h2>
      
      {/* Настройки игры */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '20px', 
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Сложность: {difficulty}/10
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={difficulty}
            onChange={(e) => changeDifficulty(parseInt(e.target.value))}
            style={{ width: '150px' }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Цвет фигур:
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => changePlayerColor('w')}
              style={{
                padding: '8px 16px',
                backgroundColor: playerColor === 'w' ? '#4CAF50' : '#ddd',
                color: playerColor === 'w' ? 'white' : 'black',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Белые
            </button>
            <button
              onClick={() => changePlayerColor('b')}
              style={{
                padding: '8px 16px',
                backgroundColor: playerColor === 'b' ? '#4CAF50' : '#ddd',
                color: playerColor === 'b' ? 'white' : 'black',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Черные
            </button>
          </div>
        </div>
      </div>
      
      <button
        onClick={startNewGame}
        style={{
          padding: '12px 24px',
          fontSize: '1.1em',
          backgroundColor: '#FF9800',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        Новая игра
      </button>
      
      {/* Информация о текущем состоянии */}
      <div style={{ marginBottom: '20px' }}>
        <p><strong>Ход:</strong> {game.turn() === 'w' ? 'белых' : 'черных'}</p>
        {game.turn() === playerColor ? (
          <p style={{ color: '#4CAF50', fontWeight: 'bold' }}>Ваш ход!</p>
        ) : (
          <p style={{ color: '#2196F3', fontWeight: 'bold' }}>
            {isThinking ? 'Компьютер думает...' : 'Ход компьютера'}
          </p>
        )}
      </div>
      
      {/* Шахматная доска */}
      <Chessboard
        position={game.fen()}
        onPieceDrop={handleMove}
        boardWidth={600}
        boardOrientation={playerColor === 'w' ? 'white' : 'black'}
      />
      
      {/* Результат игры */}
      {isGameOver && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px',
          backgroundColor: '#ffebee',
          borderRadius: '10px',
          color: '#c62828',
          fontWeight: 'bold',
          fontSize: '1.2em'
        }}>
          {result}
        </div>
      )}
      
      {/* Индикатор загрузки */}
      {isThinking && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          color: '#1976d2'
        }}>
          Компьютер анализирует позицию... ⏳
        </div>
      )}
    </div>
  );
};

export default ComputerGame;
