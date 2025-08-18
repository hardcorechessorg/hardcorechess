import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import crypto from "crypto";
import { Chess } from "chess.js";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Хранение активных игр
const games = new Map();
const gameRooms = new Map();

// Безопасные параметры и middleware
const allowedOrigins = ["https://www.hardcorechess.org", "http://localhost:3000"];

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

// Разрешаем запросы с клиента на новом домене
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  credentials: false
}));

// Rate limiting
const createJoinLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const moveLimiter = rateLimit({
  windowMs: 1 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

const stockfishLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

// Валидация входных данных
const gameIdSchema = z.string().regex(/^[A-Z0-9]{6}$/);
const playerNameSchema = z
  .string()
  .min(1)
  .max(30)
  .regex(/^[\p{L}\p{N}_ -]+$/u);
const squareSchema = z.string().regex(/^[a-h][1-8]$/);
const moveBodySchema = z.object({
  gameId: gameIdSchema,
  from: squareSchema,
  to: squareSchema,
  playerColor: z.enum(["w", "b"]),
  authToken: z.string().min(20).max(128)
});
const joinBodySchema = z.object({
  gameId: gameIdSchema,
  playerName: playerNameSchema
});
const stockfishBodySchema = z.object({
  fen: z.string().min(3).max(120),
  difficulty: z.number().int().min(1).max(10)
});

// __dirname для ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateToken() {
  return crypto.randomBytes(24).toString("hex");
}

// API маршруты
app.post("/create-multiplayer-game", createJoinLimiter, (req, res) => {
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
app.post("/join-game", createJoinLimiter, (req, res) => {
  const parseResult = joinBodySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Неверные данные запроса" });
  }
  const { gameId, playerName } = parseResult.data;
  const game = games.get(gameId);
  
  if (!game) {
    return res.status(404).json({ error: "Игра не найдена" });
  }
  
  if (game.players.length >= 2) {
    return res.status(400).json({ error: "Игра уже заполнена" });
  }
  
  // Первый игрок всегда белые, второй - черные
  const playerColor = game.players.length === 0 ? 'w' : 'b';
  const token = generateToken();
  const safeName = playerName.trim();
  game.players.push({ name: safeName, color: playerColor, ws: null, token });
  
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
    currentPlayer: game.currentPlayer,
    token
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
app.post("/multiplayer-move", moveLimiter, (req, res) => {
  const parsed = moveBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Неверные данные запроса" });
  }
  const { gameId, from, to, playerColor, authToken } = parsed.data;
  const game = games.get(gameId);
  
  if (!game || game.status !== 'playing') {
    return res.status(400).json({ error: "Игра недоступна" });
  }
  
  // Проверяем, что токен соответствует игроку и сейчас его ход
  const authorizedPlayer = game.players.find(p => p.color === playerColor && p.token === authToken);
  if (!authorizedPlayer) {
    return res.status(403).json({ error: "Недостаточно прав" });
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
app.post("/stockfish-move", stockfishLimiter, async (req, res) => {
  const parsed = stockfishBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Неверные данные запроса" });
  }
  const { fen, difficulty } = parsed.data;
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
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) {
    try { ws.close(1008, 'Origin not allowed'); } catch {}
    return;
  }
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
  // 3 байта = 6 HEX-символов
  return crypto.randomBytes(3).toString('hex').toUpperCase();
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

// Централизованная обработка ошибок
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Запуск сервера на Render
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
