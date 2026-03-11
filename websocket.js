const { WebSocketServer } = require("ws");

const { getLobby } = require("./lobbies");

let wss = null;

const clients = new Map();

const playerCanSelectCard = (playerName, lobby, cardIndex) => {
  return (
    lobby.state == "draft" &&
    lobby.currentHost != playerName &&
    !(playerName in lobby.selectedCards) &&
    cardIndex >= 0 && cardIndex <= lobby.players[playerName].availableCards.length
  );
};

const hostCanSelectCard = (playerName, lobby, cardIndex) => {
  return (
    lobby.state === "judging" &&
    lobby.currentHost === playerName &&
    cardIndex >= 0 && cardIndex <= Object.keys(lobby.selectedCards).length
  );
};

const handleAction = (ws, data, playerName, lobby) => {
  switch (data.type) {
    case "player_selected_card":
      if (playerCanSelectCard(playerName, lobby, data.cardIndex)) {
        const [selectedCard] = lobby.players[playerName].availableCards.splice(data.cardIndex, 1);
        lobby.selectedCards[playerName] = selectedCard;
        ws.send(JSON.stringify({ type: "available_cards_changed", lobby: { availableCards: lobby.players[playerName].availableCards, } }));

        // TODO: move to judging stage if all players picked cards
        const allPlayersPickedCards = Object.keys(lobby.selectedCards).length === Object.keys(lobby.players).length - 1;
        if (allPlayersPickedCards) {
          lobby.state = "judging";
          lobby.timeRemaining = 60;

          for (let player in lobby.players) {
            const client = clients.get(player);
            if (clients) {
              // Send state changed
              let payload = JSON.stringify({
                type: "state_changed",
                lobby: {
                  state: lobby.state,
                  timeRemaining: lobby.timeRemaining,
                  currentHost: lobby.currentHost,
                  selectedCards: Object.values(lobby.selectedCards),
                },
              });
              client.send(payload);

              console.log(`Initiator: ${playerName}, current: ${player}`);
              if (player == playerName) {
                console.log(`Match!`);
                const availableCards = lobby.players[player].availableCards;
                payload = JSON.stringify({ type: "available_cards_changed", lobby: { availableCards } });
                client.send(payload);
              }
            }
          }

          return;
        }

        for (let player in lobby.players) {
          let client = clients.get(player);
          if (client) {
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
      console.log("Host is attempting to select card.");
      if (hostCanSelectCard(playerName, lobby, data.cardIndex)) {
        const winnerName = Object.keys(lobby.selectedCards)[data.cardIndex];
        lobby.players[winnerName].score += 1;

        for (let player in lobby.players) {
          let client = clients.get(player);
          if (client) {
            const playersWithoutCards = Object.fromEntries(
              Object.entries(lobby.players)
                .map(
                  ([_player, { availableCards, ...data }]) => ([_player, { ...data }])
                )
            );
            client.send(JSON.stringify({
              type: "host_selected_card",
              lobby: {
                players: playersWithoutCards,
                winningCard: data.cardIndex,
              },
            }));
          }
        }
      }
      break;
  }
};

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
          let client = clients.get(player)
          if (client) {;
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

        handleAction(ws, data, playerName, lobby);
      });

      ws.send(JSON.stringify({ message: "Connected to the game lobby!" }));
    });
  });
};

module.exports = { startWebSocket };