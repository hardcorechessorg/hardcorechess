import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Chess } from "chess.js";

const app = express();
const game = new Chess();

app.use(bodyParser.json());

// Разрешаем запросы с клиента на Render
app.use(cors({
  origin: ["https://hardcorechess-client.onrender.com"], // адрес твоего клиента
  methods: ["GET", "POST"],
  credentials: true
}));

// Новая игра
app.post("/new-game", (req, res) => {
  game.reset();
  res.json({ fen: game.fen() });
});

// Сделать ход
app.post("/move", (req, res) => {
  const { from, to } = req.body;
  const move = game.move({ from, to });

  if (!move) {
    return res.json({ error: "Invalid move" });
  }

  let isGameOver = game.isGameOver();
  let result = null;

  if (isGameOver) {
    if (game.isCheckmate()) result = "Мат";
    else if (game.isDraw()) result = "Ничья";
  }

  res.json({
    fen: game.fen(),
    isGameOver,
    result
  });
});

// Запуск сервера на Render
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
