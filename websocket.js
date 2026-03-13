const { WebSocketServer } = require("ws");

const { getLobby, handleAction } = require("./lobbies");

let wss = null;

const clients = new Map();

const startWebSocket = (server, sessionParser) => {
  wss = new WebSocketServer({ server });

  wss.on("connection", (ws, request) => {
    sessionParser(request, {}, () => {
      const playerName = request.session.name;
      if (!request.session.name) {
        return;
      }

      const lobby = getLobby(playerName);
      if (!lobby || lobby.state == "waiting") return;

      const onLobbyCallback = (data) => {
        for (let player in lobby.players) {
          let client = clients.get(player);
          if (client) {
            client.send(JSON.stringify(data));
          }
        }
      };

      clients.set(playerName, ws);
      lobby.eventEmitter.on("lobby", onLobbyCallback);

      ws.on("close", () => {
        lobby.eventEmitter.off("lobby", onLobbyCallback);
        clients.delete(playerName);
      });

      ws.on("message", (message) => {
        let data;
        try {
          data = JSON.parse(message.toString());
        } catch (error) {
          console.error(error);
        }

        handleAction(playerName, data);
      });

      ws.send(JSON.stringify({ message: "Connected to the game lobby!" }));
    });
  });
};

module.exports = { startWebSocket };