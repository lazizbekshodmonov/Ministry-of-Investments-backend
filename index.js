// Express.js backend with JWT authentication and Kanban board logic
const express = require("express");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(bodyParser.json());

const SECRET = "kanban_secret";
const PORT = 3000;

// In-memory storage
let users = [];
let boards = []; // each board has userId
let states = []; // each task has boardId
let tasks = []; // each task has boardId
let currentBoardId = 1;
let currentStateId = 1;
let currentTaskId = 1;

// Middleware for authentication
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token missing" });
  try {
    const decoded = jwt.verify(token, SECRET);
    const user = users.find((b) => b.id === decoded.id);
    if (!user) return res.status(401).json({ message: "Token missing" });
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

const router = express.Router();
// Auth routes
router.post("/signup", (req, res) => {
  const { username, password, fullName } = req.body;
  if (users.find((u) => u.username === username)) {
    return res.status(400).json({ message: "User already exists" });
  }
  const newUser = {
    id: Date.now(),
    username,
    password,
    fullName,
  };

  users.push(newUser);
  res.json({ message: "User created" });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password,
  );
  if (!user) return res.status(400).json({ message: "Invalid credentials" });
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
    },
    SECRET,
  );
  res.json({ token });
});
router.get("/user-me", authenticate, (req, res) => {
  const user = users.find((b) => b.id === req.user.id);
  res.json({
    id: user.id,
    fullName: user.fullName,
    username: user.username,
  });
});
// Board routes
router.get("/boards", authenticate, (req, res) => {
  const userBoards = boards.filter((b) => b.userId === req.user.id);
  res.json(userBoards);
});

router.post("/boards", authenticate, (req, res) => {
  const board = {
    id: currentBoardId++,
    title: req.body.title,
    description: req.body.description,
    userId: req.user.id,
  };

  const newState = {
    id: currentStateId++,
    boardId: board.id,
    name: "OPEN",
  };

  boards.push(board);
  states.push(newState);
  res.json(board);
});

// Task state routes

router.post("/boards/:boardId/states", authenticate, (req, res) => {
  const boardId = parseInt(req.params.boardId);
  const board = boards.find(
    (b) => b.id === boardId && b.userId === req.user.id,
  );
  if (!board) return res.status(404).json({ message: "Board not found" });

  const newState = {
    id: currentStateId++,
    boardId,
    name: req.body.name,
  };
  states.push(newState);
  res.json(newState);
});

router.put("/boards/:boardId/states/:stateId", authenticate, (req, res) => {
  const stateId = parseInt(req.params.stateId);
  const state = states.find(
    (b) => b.id === stateId && b.userId === req.user.id,
  );
  if (!state) return res.status(404).json({ message: "State not found" });

  state.name = req.body.name ?? state.name;
  states.push(newState);
  res.json(newState);
});

router.get("/boards/:boardId/states", authenticate, (req, res) => {
  const boardId = parseInt(req.params.boardId);
  const board = boards.find(
    (b) => b.id === boardId && b.userId === req.user.id,
  );
  if (!board) return res.status(404).json({ message: "Board not found" });

  const boardStates = states.filter((state) => state.boardId === boardId);

  res.json(boardStates);
});

router.delete("/boards/:boardId/states/:stateId", authenticate, (req, res) => {
  const boardId = parseInt(req.params.boardId);
  const stateId = parseInt(req.params.stateId);
  const board = boards.find(
    (b) => b.id === boardId && b.userId === req.user.id,
  );
  const state = states.find((state) => state.id === stateId);

  if (!board || !state)
    return res.status(404).json({ message: "Board not found" });

  states = states.filter(
    (item) => item.id !== stateId || item.boardId !== boardId,
  );
  res.json({ message: "State deleted" });
});

// Task routes
router.get("/boards/:boardId/tasks", authenticate, (req, res) => {
  const boardId = parseInt(req.params.boardId);
  const board = boards.find(
    (b) => b.id === boardId && b.userId === req.user.id,
  );
  if (!board) return res.status(404).json({ message: "Board not found" });

  const boardTasks = tasks.filter((t) => t.boardId === boardId);
  res.json(boardTasks);
});

router.post("/boards/:boardId/tasks", authenticate, (req, res) => {
  const boardId = parseInt(req.params.boardId);
  const board = boards.find(
    (b) => b.id === boardId && b.userId === req.user.id,
  );
  if (!board) return res.status(404).json({ message: "Board not found" });

  const task = {
    id: currentTaskId++,
    boardId,
    stateId: req.body.stateId,
    title: req.body.title,
    description: req.body.description,
    priority: req.body.priority || "normal",
  };

  tasks.push(task);
  res.json(task);
});

router.put("/boards/tasks/:taskId", authenticate, (req, res) => {
  const taskId = parseInt(req.params.taskId);

  const task = tasks.find((t) => t.id === taskId);
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (req.body.stateId) {
    const state = states.find((state) => state.id === req.body.stateId);
    if (!state) return res.status(404).json({ message: "State not found" });
  }

  task.title = req.body.title ?? task.title;
  task.description = req.body.description ?? task.description;
  task.priority = req.body.priority ?? task.priority;
  task.stateId = req.body.stateId ?? task.stateId;

  res.json(task);
});

router.delete("/boards/tasks/:taskId", authenticate, (req, res) => {
  const taskId = parseInt(req.params.taskId);
  tasks = tasks.filter((t) => t.id !== taskId);
  res.json({ message: "Task deleted" });
});

app.use("/api/v1/", router);
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
