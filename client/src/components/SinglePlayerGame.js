import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { useNavigate } from 'react-router-dom';

const SinglePlayerGame = () => {
  const navigate = useNavigate();
  const [fen, setFen] = useState("");
  const [isGameOver, setIsGameOver] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    startNewGame();
  }, []);

  async function startNewGame() {
    try {
      // Сервер на Render, клиент на hardcorechess.org
      const res = await fetch("https://hardcorechess.onrender.com/new-game", { method: "POST" });
      const data = await res.json();
      setFen(data.fen);
      setIsGameOver(false);
      setResult(null);
    } catch (error) {
      console.error('Ошибка при создании новой игры:', error);
    }
  }

  async function handleMove(sourceSquare, targetSquare) {
    if (isGameOver) return false;

    try {
      const res = await fetch("https://hardcorechess.onrender.com/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: sourceSquare, to: targetSquare })
      });

      const data = await res.json();

      if (data.error) return false;

      setFen(data.fen);
      setIsGameOver(data.isGameOver);
      setResult(data.result);

      return true;
    } catch (error) {
      console.error('Ошибка при выполнении хода:', error);
      return false;
    }
  }

  return (
    <div className="section">
      <button 
        onClick={() => navigate('/')}
        className="button"
        style={{ marginBottom: 12 }}
      >
        Назад
      </button>
      
      <h2>Одиночная игра</h2>
      
      <button 
        onClick={startNewGame}
        className="button"
        style={{ marginBottom: 16 }}
      >
        Новая игра
      </button>

      <div className="board-wrap">
        <Chessboard
          position={fen}
          onPieceDrop={handleMove}
          boardWidth={600}
        />
      </div>

      {isGameOver && (
        <div className="panel" style={{ marginTop: 16, color: '#ff8a80', fontWeight: 'bold' }}>
          {result}
        </div>
      )}
    </div>
  );
};

export default SinglePlayerGame;
