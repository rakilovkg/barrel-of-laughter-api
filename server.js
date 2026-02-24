const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  require('dotenv').config();
}

const http = require('http');
const express = require('express');
const cors = require('cors');
const session = require('express-session');

const { WebSocketServer } = require("ws");

const { playersRouter } = require("./players");
const { lobbiesRouter } = require("./lobbies");

const identityMiddleware = require("./middleware/identity");

const app = express();

// CORS setup (allow frontend)
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));

app.use(express.json());
app.set("trust proxy", 1);

// Session middleware (shared between HTTP + WS)
const sessionParser = session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.SESSION_SECRET || "xtal",
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24,
  },
});

app.use(sessionParser);

// Routes
app.use("/players", playersRouter);
app.use("/lobby", identityMiddleware, lobbiesRouter);

// Create HTTP Server
const server = http.createServer(app);

// Render-assigned port
const PORT = process.env.PORT || 8443;

async function startServer() {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

// Create WebSocket Server
const wss = new WebSocketServer({
  server,
});

wss.on("connection", (ws, request) => {
  sessionParser(request, {}, () => {
    if (request.session) {
      console.log("User connected:", request.session.name);

      ws.on("message", (message) => {
        console.log("Received:", message.toString());
      });

      ws.send("Connected to the game lobby!");
    }
  });
});