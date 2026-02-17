const express = require("express");

const playersRouter = express.Router();

const { getLobby } = require("./lobbies");

const takenNames = new Set();

playersRouter.get('/', (req, res) => {
  const data = { name: req.session.name, };
  if (!data.name) {
    data.location = "input";
    return res.status(200).json(data);
  }

  const lobby = getLobby(data.name);
  if (!lobby) {
    data.location = "join";
    return res.status(200).json(data);
  }
  
  data.location = "lobby";
  data.lobby = lobby;
  return res.status(200).json(data);
});

playersRouter.post('/set-name', (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ message: 'Name is required.' });
    return;
  }

  if (takenNames.has(name)) {
    res.status(400).json({ message: 'Name is already taken.' });
    return;
  }

  req.session.name = name;
  takenNames.add(name);
  res.status(200).json({ name, location: "join" });
});

module.exports = { playersRouter };