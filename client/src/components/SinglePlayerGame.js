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
      
      <h2>🧩 Одиночная игра</h2>
      
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

      <Chessboard
        position={fen}
        onPieceDrop={handleMove}
        boardWidth={600}
      />

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
    </div>
  );
};

export default SinglePlayerGame;
