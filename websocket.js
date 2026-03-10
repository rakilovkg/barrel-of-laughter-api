const { WebSocketServer } = require("ws");

const { getLobby } = require("./lobbies");

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
          if (clients.has(player)) {
            clients.get(player).send(JSON.stringify(data));
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

        switch (data.type) {
          case "player_selected_card":
            if (
              lobby.state == "draft" &&
              lobby.currentHost != playerName &&
              !(playerName in lobby.selectedCards) &&
              data.cardIndex >= 0 && data.cardIndex <= 9
            ) {
              const selectedCard = lobby.players[playerName].availableCards.splice(data.cardIndex, 1);
              lobby.selectedCards[playerName] = selectedCard[0];
              ws.send(JSON.stringify({ type: "available_cards_changed", lobby: { availableCards: lobby.players[playerName].availableCards, } }));

              // TODO: move to judging stage if all players picked cards
              const allPlayersPickedCards = Object.keys(lobby.selectedCards).length == Object.keys(lobby.players).length - 1;
              if (allPlayersPickedCards) {
                lobby.state = "judging";
                lobby.timeRemaining = 60;

                for (let player in lobby.players) {
                  if (clients.has(player)) {
                    // Send state changed
                    const client = clients.get(player);
                    let data = JSON.stringify({
                      type: "state_changed",
                      lobby: {
                        state: lobby.state,
                        timeRemaining: lobby.timeRemaining,
                        currentHost: lobby.currentHost,
                        selectedCards: Object.values(lobby.selectedCards),
                      },
                    });
                    client.send(data);

                    console.log(`Initiator: ${playerName}, current: ${player}`);
                    if (player == playerName) {
                      console.log(`Match!`);
                      const availableCards = lobby.players[player].availableCards;
                      data = JSON.stringify({ type: "available_cards_changed", lobby: { availableCards } });
                      client.send(data);
                    }
                  }
                }

                return;
              }

              for (let player in lobby.players) {
                if (clients.has(player)) {
                  const client = clients.get(player);
                  client.send(JSON.stringify({
                    type: "player_selected_card",
                    lobby: {
                      selectedCards: Object.values(lobby.selectedCards),
                    },
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
    });
  });
};

module.exports = { startWebSocket };