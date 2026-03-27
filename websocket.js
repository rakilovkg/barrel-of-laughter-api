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

      clients.set(playerName, ws);
      
      const onLobbyUpdateCallback = (players, data) => {
        
        for (let player of players) {
          let client = clients.get(player);
          if (client) {
            client.send(JSON.stringify(data));
          }
        }
      };
      lobby.eventEmitter.on("update", onLobbyUpdateCallback);

      ws.on("close", () => {
        lobby.eventEmitter.off("lobby", onLobbyUpdateCallback);
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
    });
  });
};

module.exports = { startWebSocket };