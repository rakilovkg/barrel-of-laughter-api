const { WebSocketServer } = require("ws");

const { getLobby } = require("./lobbies");

let wss = null;

const clients = new Map();

const startWebSocket = (server, sessionParser) => {
    wss = new WebSocketServer({ server });
    wss.on("connection", (ws, request) => {
        sessionParser(request, {}, () => {
            if (request.session) {
                const playerName = request.session.name;

                clients.set(playerName, ws);
                ws.on("close", () => clients.delete(playerName));

                ws.on("message", (message) => {
                    const lobby = getLobby(playerName);
                    if (!lobby || lobby.state == "waiting") return;

                    // Subscribe to events
                    lobby.eventEmitter.on("lobby", (data) => {
                      for (let player in lobby.players) {
                        if (clients.has(player)) {
                          console.log("Lobby event.", data);
                          clients.get(player).send(JSON.stringify(data));
                        }
                      }
                    });

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
                                ws.send(JSON.stringify({ type: "available_cards_changed", availableCards: lobby.players[playerName].availableCards, }));

                                // TODO: move to judging stage if all players picked cards
                                if (Object.keys(lobby.selectedCards).length == lobby.players.length - 1) {
                                  lobby.state = "judging";
                                  lobby.timeRemaining = 60;
                                }

                                for (let player in lobby.players) {
                                    if (clients.has(client) && client.readyState === client.OPEN) {
                                        const client = clients.get(player);
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
};

module.exports = { startWebSocket };