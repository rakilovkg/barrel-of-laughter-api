const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  require('dotenv').config();
}

const http = require('http');
const express = require('express');
const cors = require('cors');
const session = require('express-session');

const { playersRouter } = require("./players");
const { lobbiesRouter } = require("./lobbies");

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
app.use("/lobby", lobbiesRouter);

// Create HTTP + WebSocket server
const server = http.createServer(app);

// Use Render-assigned port
const PORT = process.env.PORT || 8443;

async function startServer() {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
