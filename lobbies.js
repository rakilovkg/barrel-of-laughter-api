const express = require("express");
const { v4: uuidv4 } = require("uuid");
const SSE = require('express-sse');

const lobbiesRouter = express.Router();

const lobbies = [];

const getLobbyPlayerCreated = (playerName) => lobbies.find(lobby => lobby.authorName == playerName);
const getLobbyPlayerJoined = (playerName) => lobbies.find(lobby => lobby.players.includes(playerName));
const getLobby = (playerName) => lobbies.find(lobby => lobby.authorName == playerName || lobby.players.includes(playerName));

function getRandomInteger(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function generateLobbyPassword() {
  const allowedCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-+*/=-,.&!;";
  const passwordLength = getRandomInteger(16, 24);
  let password = "";
  for (let i = 1; i <= passwordLength; i += 1) {
    password += allowedCharacters[getRandomInteger(0, allowedCharacters.length - 1)];
  }
  return password;
}

function getLobbyInfo(playerName) {
  const createdLobbies = getLobbyPlayerCreated(playerName);
  if (createdLobbies) {
    return { isInLobby: true, isAuthor: true, players: createdLobbies.players };
  }
  
  const joinedLobbies = getLobbyPlayerJoined(playerName);
  if (joinedLobbies) {
    return { isInLobby: true, isAuthor: false, players: joinedLobbies.players };
  }
  
  return { isInLobby: false, isAuthor: false, players: [] };
}

lobbiesRouter.post("/", (req, res) => {
  const playerName = req.session.name;

  if (getLobbyPlayerCreated(playerName)) {
    return res.status(400).json({ message: "You have already created a lobby. Delete the current to create new." });
  }

  if (getLobbyPlayerJoined(playerName)) {
    return res.status(400).json({ message: "You are in a lobby. Disconnect from lobby to create yours." });
  }
  
  const lobby = {
    id: uuidv4(),
    password: generateLobbyPassword(),
    state: "waiting",
    authorName: playerName, 
    players: [],
    sse: new SSE(),
  };
  lobbies.push(lobby);
  const { sse, ...lobbyWithoutSSE } = lobby;
  res.status(200).json({ location: "lobby", lobby: lobbyWithoutSSE });
});

lobbiesRouter.post("/join", (req, res) => {
  const lobby = lobbies.find(lobby => lobby.id == req.body.lobbyId);
  if (!lobby || req.body.lobbyPassword != lobby.password) {
    return res.status(400).json({ message: "Incorrect lobby id or password" });
  }
  
  lobby.players.push(req.session.name);
  lobby.sse.send({ type: "players", players: lobby.players });
  res.status(200).json({ location: "lobby", lobby });
});

lobbiesRouter.post("/disconnect", (req, res) => {
  const playerName = req.session.name;
  let isAuthor = false;
  
  const lobby = lobbies.find(lobby => {
    if (lobby.authorName == playerName) {
      isAuthor = true;
      return lobby;
    }

    if (lobby.players.includes(playerName)) {
      return lobby;
    }
  });

  if (!lobby) {
    return res.status(400).json({ message: "You aren't in any lobby to disconnect." });
  }

  if (isAuthor) {
    lobbies.splice(lobbies.indexOf(lobby), 1);
    lobby.sse.send({ type: "author_disconnected", players: lobby.players, });
  } else {
    lobby.players.splice(lobby.players.indexOf(playerName), 1);
    lobby.sse.send({ type: "player_disconnected", players: lobby.players, });
  }

  return res.status(200).json({ location: "join", lobby });
});

lobbiesRouter.get("/events", (req, res) => {
  const { lobbyId } = req.query;
  const lobby = lobbies.find(lobby => lobby.id == lobbyId);
  if (lobby) {
    lobby.sse.init(req, res);
  }
});

module.exports = { lobbiesRouter, getLobbyInfo, getLobby };
