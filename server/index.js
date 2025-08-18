import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Chess } from "chess.js";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { spawn } from "child_process";
import path from "path";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Хранение активных игр
const games = new Map();
const gameRooms = new Map();

app.use(bodyParser.json());

// Разрешаем запросы с клиента на новом домене
app.use(cors({
  origin: ["https://www.hardcorechess.org", "http://localhost:3000"],
  methods: ["GET", "POST"],
  credentials: true
}));

// API маршруты
app.post("/create-multiplayer-game", (req, res) => {
  const gameId = generateGameId();
  const game = new Chess();
  
  games.set(gameId, {
    chess: game,
    players: [],
    spectators: [],
    currentPlayer: 'w', // белые всегда начинают
    status: 'waiting' // waiting, playing, finished
  });
  
  gameRooms.set(gameId, new Set());
  
  res.json({ 
    gameId, 
    // Сервер на Render, клиент на hardcorechess.org
    joinUrl: `https://www.hardcorechess.org/#/multiplayer?join=${gameId}`,
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
  
  // Первый игрок всегда белые, второй - черные
  const playerColor = game.players.length === 0 ? 'w' : 'b';
  game.players.push({ name: playerName, color: playerColor, ws: null });
  
  if (game.players.length === 2) {
    game.status = 'playing';
    // Белые всегда начинают
    game.currentPlayer = 'w';
  }
  
  res.json({ 
    success: true, 
    color: playerColor, 
    fen: game.chess.fen(),
    players: game.players.map(p => ({ name: p.name, color: p.color })),
    currentPlayer: game.currentPlayer
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

// Функция для получения хода от ИИ (альфа-бета, глубина зависит от difficulty)
async function getStockfishMove(fen, difficulty) {
  const game = new Chess(fen);
  const legalMoves = game.moves();
  if (legalMoves.length === 0) {
    throw new Error("Нет доступных ходов");
  }

  // Маппинг сложности (1-10) в глубину поиска
  // 1-3 → 1, 4-6 → 2, 7-8 → 3, 9-10 → 4
  const depth = difficulty >= 9 ? 4 : difficulty >= 7 ? 3 : difficulty >= 4 ? 2 : 1;

  // Небольшой стохастический фактор для низких сложностей
  const addNoise = difficulty <= 3;

  // Оценочная функция (материал + простая мобильность)
  function evaluatePosition(evalGame) {
    if (evalGame.isCheckmate()) {
      // Если мат текущему игроку, это очень плохо, иначе очень хорошо
      return evalGame.turn() === 'w' ? -Infinity : Infinity;
    }
    if (evalGame.isDraw()) return 0;

    const board = evalGame.board();
    let score = 0;
    const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

    for (let rank of board) {
      for (let piece of rank) {
        if (!piece) continue;
        const val = pieceValues[piece.type] || 0;
        score += piece.color === 'w' ? val : -val;
      }
    }

    // Мобильность: количество ходов (белые - черные) * небольшой коэффициент
    const whiteMoves = countMovesFor(evalGame, 'w');
    const blackMoves = countMovesFor(evalGame, 'b');
    score += (whiteMoves - blackMoves) * 2;

    return score;
  }

  function countMovesFor(baseGame, color) {
    const g = new Chess(baseGame.fen());
    if (g.turn() !== color) {
      // Сделаем пустой ход для смены стороны? Нельзя. Просто считаем грубо: переведем ход цвету
      // Создадим позицию и просчитаем без изменения хода
    }
    try {
      // chess.js генерирует ходы только для текущего игрока
      // Если не его ход, тогда временно сделаем null move симуляцией: перебор всех ходов соперника и суммирование? Это дорого.
      // Упростим: если не его ход, вернем 0; мобильность учитывается приблизительно.
      if (g.turn() !== color) return 0;
      return g.moves().length;
    } catch {
      return 0;
    }
  }

  // Упорядочивание ходов: сначала взятия, затем остальные
  function orderMoves(g, moves) {
    return moves.sort((a, b) => {
      const am = g.move(a); g.undo();
      const bm = g.move(b); g.undo();
      const acap = am && am.captured ? 1 : 0;
      const bcap = bm && bm.captured ? 1 : 0;
      return bcap - acap;
    });
  }

  function alphaBeta(g, currentDepth, alpha, beta, maximizingPlayer) {
    if (currentDepth === 0 || g.isGameOver()) {
      return evaluatePosition(g);
    }
    let best;
    const moves = orderMoves(g, g.moves());
    if (maximizingPlayer) {
      best = -Infinity;
      for (const m of moves) {
        g.move(m);
        const val = alphaBeta(g, currentDepth - 1, alpha, beta, false);
        g.undo();
        if (val > best) best = val;
        if (best > alpha) alpha = best;
        if (beta <= alpha) break;
      }
      return best;
    } else {
      best = Infinity;
      for (const m of moves) {
        g.move(m);
        const val = alphaBeta(g, currentDepth - 1, alpha, beta, true);
        g.undo();
        if (val < best) best = val;
        if (best < beta) beta = best;
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  // Определяем, кто делает ход в текущей позиции
  const maximizing = game.turn() === 'w';
  let bestScore = maximizing ? -Infinity : Infinity;
  let bestMoves = [];
  const moves = orderMoves(game, legalMoves.slice());
  for (const m of moves) {
    game.move(m);
    const score = alphaBeta(game, depth - 1, -Infinity, Infinity, !maximizing);
    game.undo();
    if (maximizing) {
      if (score > bestScore) { bestScore = score; bestMoves = [m]; }
      else if (score === bestScore) { bestMoves.push(m); }
    } else {
      if (score < bestScore) { bestScore = score; bestMoves = [m]; }
      else if (score === bestScore) { bestMoves.push(m); }
    }
  }

  // Небольшая случайность на низких уровнях
  const chosen = addNoise && bestMoves.length > 1
    ? bestMoves[Math.floor(Math.random() * bestMoves.length)]
    : bestMoves[0] || legalMoves[0];

  return chosen;
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

// Простая обработка всех остальных запросов для React SPA
app.get('*', (req, res) => {
  // Если это API запрос, возвращаем 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Для всех остальных запросов возвращаем index.html
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Запуск сервера на Render
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
