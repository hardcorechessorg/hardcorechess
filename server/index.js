import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Chess } from "chess.js";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { spawn } from "child_process";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Хранение активных игр
const games = new Map();
const gameRooms = new Map();

app.use(bodyParser.json());

// Разрешаем запросы с клиента на Render
app.use(cors({
  origin: ["https://hardcorechess-client.onrender.com", "http://localhost:3000"],
  methods: ["GET", "POST"],
  credentials: true
}));

// Создать новую многопользовательскую игру
app.post("/create-multiplayer-game", (req, res) => {
  const gameId = generateGameId();
  const game = new Chess();
  
  games.set(gameId, {
    chess: game,
    players: [],
    spectators: [],
    currentPlayer: 'w', // белые начинают
    status: 'waiting' // waiting, playing, finished
  });
  
  gameRooms.set(gameId, new Set());
  
  res.json({ 
    gameId, 
    joinUrl: `https://hardcorechess-client.onrender.com/game/${gameId}`,
    fen: game.fen() 
  });
});

// Присоединиться к игре
app.post("/join-game", (req, res) => {
  const { gameId, playerName } = req.body;
  const game = games.get(gameId);
  
  if (!game) {
    return res.status(404).json({ error: "Игра не найдена" });
  }
  
  if (game.players.length >= 2) {
    return res.status(400).json({ error: "Игра уже заполнена" });
  }
  
  const playerColor = game.players.length === 0 ? 'w' : 'b';
  game.players.push({ name: playerName, color: playerColor, ws: null });
  
  if (game.players.length === 2) {
    game.status = 'playing';
  }
  
  res.json({ 
    success: true, 
    color: playerColor, 
    fen: game.chess.fen(),
    players: game.players.map(p => ({ name: p.name, color: p.color }))
  });
});

// Получить информацию об игре
app.get("/game/:gameId", (req, res) => {
  const { gameId } = req.params;
  const game = games.get(gameId);
  
  if (!game) {
    return res.status(404).json({ error: "Игра не найдена" });
  }
  
  res.json({
    fen: game.chess.fen(),
    players: game.players.map(p => ({ name: p.name, color: p.color })),
    status: game.status,
    currentPlayer: game.currentPlayer
  });
});

// Сделать ход в многопользовательской игре
app.post("/multiplayer-move", (req, res) => {
  const { gameId, from, to, playerColor } = req.body;
  const game = games.get(gameId);
  
  if (!game || game.status !== 'playing') {
    return res.status(400).json({ error: "Игра недоступна" });
  }
  
  if (game.currentPlayer !== playerColor) {
    return res.status(400).json({ error: "Не ваш ход" });
  }
  
  const move = game.chess.move({ from, to });
  if (!move) {
    return res.json({ error: "Неверный ход" });
  }
  
  // Переключаем игрока
  game.currentPlayer = game.currentPlayer === 'w' ? 'b' : 'w';
  
  let isGameOver = game.chess.isGameOver();
  let result = null;
  
  if (isGameOver) {
    game.status = 'finished';
    if (game.chess.isCheckmate()) result = "Мат";
    else if (game.chess.isDraw()) result = "Ничья";
  }
  
  // Уведомляем всех игроков через WebSocket
  const room = gameRooms.get(gameId);
  if (room) {
    room.forEach(ws => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify({
          type: 'move',
          fen: game.chess.fen(),
          from,
          to,
          currentPlayer: game.currentPlayer,
          isGameOver,
          result
        }));
      }
    });
  }
  
  res.json({
    fen: game.chess.fen(),
    currentPlayer: game.currentPlayer,
    isGameOver,
    result
  });
});

// Игра против Stockfish
app.post("/stockfish-move", async (req, res) => {
  const { fen, difficulty } = req.body;
  const game = new Chess(fen);
  
  if (game.isGameOver()) {
    return res.json({ error: "Игра окончена" });
  }
  
  try {
    const stockfishMove = await getStockfishMove(fen, difficulty);
    const move = game.move(stockfishMove);
    
    if (!move) {
      return res.json({ error: "Ошибка хода Stockfish" });
    }
    
    let isGameOver = game.isGameOver();
    let result = null;
    
    if (isGameOver) {
      if (game.isCheckmate()) result = "Мат";
      else if (game.isDraw()) result = "Ничья";
    }
    
    res.json({
      fen: game.fen(),
      move: stockfishMove,
      isGameOver,
      result
    });
  } catch (error) {
    res.status(500).json({ error: "Ошибка Stockfish" });
  }
});

// WebSocket соединения для многопользовательской игры
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const gameId = url.searchParams.get('gameId');
  
  if (gameId && games.has(gameId)) {
    const room = gameRooms.get(gameId);
    room.add(ws);
    
    // Находим игрока и привязываем WebSocket
    const game = games.get(gameId);
    const player = game.players.find(p => p.ws === null);
    if (player) {
      player.ws = ws;
    }
    
    ws.on('close', () => {
      room.delete(ws);
      if (room.size === 0) {
        games.delete(gameId);
        gameRooms.delete(gameId);
      }
    });
  }
});

// Функция для получения хода от Stockfish
async function getStockfishMove(fen, difficulty) {
  return new Promise((resolve, reject) => {
    // Для демонстрации используем простую логику
    // В реальном проекте здесь должен быть Stockfish
    const game = new Chess(fen);
    const moves = game.moves();
    
    if (moves.length === 0) {
      reject(new Error("Нет доступных ходов"));
      return;
    }
    
    // Простая логика: выбираем случайный ход
    // В реальности здесь должен быть Stockfish с настройкой сложности
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    
    // Имитируем задержку в зависимости от сложности
    setTimeout(() => {
      resolve(randomMove);
    }, 1000 - (difficulty * 50));
  });
}

// Генерация уникального ID игры
function generateGameId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Новая игра (для одиночной игры)
app.post("/new-game", (req, res) => {
  const game = new Chess();
  res.json({ fen: game.fen() });
});

// Сделать ход (для одиночной игры)
app.post("/move", (req, res) => {
  const { from, to } = req.body;
  const game = new Chess();
  
  // Здесь должна быть логика для загрузки текущей позиции
  // Пока что просто создаем новую игру
  
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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
