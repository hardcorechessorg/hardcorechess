import express from "express";
import cors from "cors";
import { Chess } from "chess.js";

const app = express();
app.use(cors());
app.use(express.json());

let game = new Chess();

// Запуск новой игры
app.post("/new-game", (req, res) => {
  game = new Chess();
  res.json({ fen: game.fen(), moves: [] });
});

// Сделать ход игрока
app.post("/move", (req, res) => {
  const { from, to } = req.body;

  // Ход игрока
  const playerMove = game.move({ from, to, promotion: "q" });
  if (!playerMove) {
    return res.status(400).json({ error: "Invalid move" });
  }

  // Если игра не окончена — ходит бот (пока случайный)
  if (!game.isGameOver()) {
    const possibleMoves = game.moves();
    if (possibleMoves.length > 0) {
      const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      game.move(randomMove);
    }
  }

  res.json({
    fen: game.fen(),
    isGameOver: game.isGameOver(),
    result: getGameResult(),
  });
});

// Получить текущую позицию
app.get("/fen", (req, res) => {
  res.json({
    fen: game.fen(),
    isGameOver: game.isGameOver(),
    result: getGameResult(),
  });
});

function getGameResult() {
  if (!game.isGameOver()) return null;
  if (game.isCheckmate()) {
    return game.turn() === "w" ? "Черные победили" : "Белые победили";
  }
  if (game.isDraw()) return "Ничья";
  return "Игра окончена";
}

app.listen(3001, () => console.log("✅ Сервер запущен на http://localhost:3001"));
