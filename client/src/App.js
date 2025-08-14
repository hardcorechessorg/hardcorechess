import { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";

export default function App() {
  const [fen, setFen] = useState("");
  const [isGameOver, setIsGameOver] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    startNewGame();
  }, []);

  async function startNewGame() {
    const res = await fetch("http://localhost:3001/new-game", { method: "POST" });
    const data = await res.json();
    setFen(data.fen);
    setIsGameOver(false);
    setResult(null);
  }

  async function handleMove(sourceSquare, targetSquare) {
    if (isGameOver) return false;

    const res = await fetch("http://localhost:3001/move", {
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
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>♟ Шахматы</h1>
      <button onClick={startNewGame}>Новая игра</button>

      <Chessboard
        position={fen}
        onPieceDrop={handleMove}
        boardWidth={600}
      />

      {isGameOver && (
        <div style={{ marginTop: 20, fontWeight: "bold", color: "red" }}>
          {result}
        </div>
      )}
    </div>
  );
}
