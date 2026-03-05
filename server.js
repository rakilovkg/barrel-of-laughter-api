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
const { getLobby } = require("./lobbies");

const wss = new WebSocketServer({
  server,
});

const clients = new Map();

wss.on("connection", (ws, request) => {
  sessionParser(request, {}, () => {
    if (request.session) {
      const playerName = request.session.name;

      clients.set(playerName, ws);
      ws.on("close", () => clients.delete(playerName));

      ws.on("message", (message) => {
        const lobby = getLobby(playerName);
        if (!lobby) return;

        let data;
        try {
          data = JSON.parse(message.toString());
        } catch (error) {
          console.error(error);
        }

        switch (data.type) {
          case "player_selected_card":
            /*
            1. Find the player's lobby.
            2. Conditions: is draft?, not host? has not yet selected a card?
            3. Notify other players in the lobby about the choice -> selectedCards
            4. Send the player remaining cards
            */
            if (
              lobby.state == "draft" &&
              lobby.currentHost != playerName &&
              !(playerName in lobby.selectedCards) &&
              data.cardIndex >= 0 && data.cardIndex <= 9
            ) {
              /*
              1. Remove card from the player
              2. Set selected cards in lobby
              3. Notify all players about selected cards
              4. Notify player about remaining cards
              */
              const selectedCard = lobby.players[playerName].availableCards.splice(data.cardIndex, 1);
              lobby.selectedCards[playerName] = selectedCard[0];
              ws.send(JSON.stringify({ type: "available_cards_changed", availableCards: lobby.players[playerName].availableCards, }));

              for (let player in lobby.players) {
                const client = clients.get(player);
                if (client && client.readyState === client.OPEN) {
                  client.send(JSON.stringify({
                    type: "player_selected_card",
                    selectedCards: Object.values(lobby.selectedCards)
                  }));
                }
              }
            }
            break;
          case "host_selected_card":
            /*
            1. Find the host's lobby.
            2. Conditions: is selection?, has not yet selected a card?
            3. Notify other players in the lobby about the choice -> who wins?
            4. Start match again
            */
            break;
        }
      });

      ws.send(JSON.stringify({ message: "Connected to the game lobby!" }));
    }
  });
});