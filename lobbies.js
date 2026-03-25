const express = require("express");
const { v4: uuidv4 } = require("uuid");

const { EventEmitter } = require("node:events");

const phrases = [
  "enter_room",
  "yar_har_har",
  "party_slogan",
  "whats_missing",
  "based_government",
  "behind_your_back",
  "secret_agent",
  "italian_meal",
  "apocalypse_prevented",
  "ew_reaction",
  "prophecy",
  "worst_moment_door",
  "wedding_surprise",
  "scientists_evolving",
  "jury_gasped",
  "season_warning",
  "law_violation_arrival",
  "economy_luxury",
  "villain_final_form",
  "breaking_news_missing",
  "unknown_flying_object",
  "carry_out_punishment",
  "laughed_river",
  "the_good_bad",
  "lock_stock",
  "secret_ingredient",
  "what_to_propose",
  "on_your_mind",
  "whats_that_smell",
  "museum_stolen",
  "before_time",
  "birthday_too_much",
];

const cards = [
  "cucumber_with_legs",
  "four_horsemen",
  "zombie_crowbar_leg",
  "explosion",
  "toilet_without_seat",
  "stinky_tofu",
  "cactus_toilet",
  "confident_raccoon",
  "grandma_wifi",
  "support_pigeons",
  "screaming_spaghetti",
  "tax_paying_dragon",
  "ceo_of_soup",
  "goose_vendetta",
  "invisible_disco_dancers",
  "time_traveling_sandwich",
  "ghost_expired_milk",
  "diabetes",
  "conspiracy_hamster",
  "unfinished_homework_smell",
  "pirate_allergies",
  "motivational_raccoon",
  "unremovable_glitter",
  "one_spell_wizard",
  "anxious_spaghetti",
  "duck_witness_protection",
  "karaoke_ghost",
  "cat_for_mayor",
  "dramatic_squirrel",
  "awkward_silence_embodiment",
  "potato_wifi",
  "clumsy_ninja",
  "overcaffeinated_sloth",
  "haunted_rubber_chicken",
  "fridge_of_regrets",
  "suspicious_glitter",
  "confused_time_traveler",
  "support_cactus",
  "coupon_villain",
  "medieval_chicken",
  "three_kids_detective",
  "disco_ball_of_doom",
  "energy_drink_wizard",
  "goose_wifi",
  "cursed_karaoke_machine",
  "coupon_dragon",
  "interpretive_dance_battle",
  "sentient_pizza",
  "haunted_sock_drawer",
  "raccoon_linkedin",
  "pigeon_drone",
  "wizard_unpaid_intern",
  "anxious_moose",
  "judging_fridge",
  "dramatic_fog_machine",
  "ninja_turtle_cousin",
  "sentient_mustache",
  "pirate_accountant",
  "goose_knows_secrets",
  "incorrect_booing_ghost",
  "ketchup_fearing_vampire",
  "screaming_poster",
  "pool_noodle_wizard_duel",
  "squirrel_summoning_circle",
  "haunted_powerpoint",
  "mayonnaise_time_machine",
  "impostor_syndrome_dragon",
  "rent_paying_cat",
  "possessed_yoga_mat",
  "karaoke_battle_death",
  "suspicious_llama",
  "disappearing_sock",
  "wizard_stuck_traffic",
  "toddler_pirate_radio",
  "knitting_dinosaur",
  "sentient_traffic_cone",
  "haunted_blender",
  "roller_skating_goose",
  "conspiracy_parrot",
  "sentient_spreadsheet",
  "raccoon_law_degree",
  "disco_skeleton",
  "why_screaming_potato",
  "haunted_gps",
  "mild_inconvenience_villain",
  "chicken_conspiracy",
  "dramatic_chipmunk_reunion",
  "sentient_nap",
  "forgot_wand_wizard",
  "goose_commitment_issues",
  "haunted_selfie_stick",
  "meme_hoarding_dragon",
  "intelligent_goldfish",
  "loud_ninja",
  "possessed_shopping_cart",
  "coffee_time_loop",
  "sentient_homework",
  "haunted_kazoo",
  "motivational_goblin",
  "wizard_snack_meeting"
];

const roundDuration = 30;

const lobbiesRouter = express.Router();

const lobbies = [];

const getLobbyPlayerCreated = (playerName) => lobbies.find(lobby => lobby.authorName == playerName);
const getLobbyPlayerJoined = (playerName) => lobbies.find(lobby => playerName in lobby.players);
const getLobby = (playerName) => lobbies.find(lobby => playerName in lobby.players);

function getRandomInteger(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = getRandomInteger(0, i);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const playerCanSelectCard = (playerName, lobby, cardIndex) => {
  return (
    lobby.state == "draft" &&
    lobby.currentHost != playerName &&
    !(playerName in lobby.selectedCards) &&
    cardIndex >= 0 && cardIndex <= lobby.players[playerName].availableCards.length
  );
};

const pickPhrase = (lobby) => {
  const newPhrase = lobby.phrases.pop();
  lobby.currentPhrase = newPhrase;
  lobby.phrases.unshift(newPhrase);
};

const pickInitialCardsForPlayers = (lobby) => {
  for (let player in lobby.players) {
    const availableCards = lobby.cards.splice(0, 10);
    lobby.players[player] = { score: 0, availableCards };
    lobby.cards.push(...availableCards);
  }
};

const hostCanSelectCard = (playerName, lobby, cardIndex) => {
  return (
    lobby.state === "judging" &&
    lobby.currentHost === playerName &&
    cardIndex >= 0 && cardIndex <= Object.keys(lobby.selectedCards).length &&
    !lobby.winnerName
  );
};

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

const playersSSE = new Map();

lobbiesRouter.post("/", (req, res) => {
  const playerName = req.session.name;

  if (getLobbyPlayerCreated(playerName)) {
    return res.status(400).json({ message: "lobby_already_created" });
  }

  if (getLobbyPlayerJoined(playerName)) {
    return res.status(400).json({ message: "lobby_already_joined" });
  }

  const lobby = {
    id: uuidv4(),
    password: generateLobbyPassword(),
    state: "waiting",
    authorName: playerName,
    winningCardIndex: -1,
    players: { [playerName]: {} },
    eventEmitter: new EventEmitter(),
  };

  lobbies.push(lobby);
  res.status(200).json({ location: "lobby", lobby });
});

lobbiesRouter.post("/join", (req, res) => {
  if (!req.body.lobbyId || !req.body.lobbyPassword) {
    return res.status(400).json({ message: "input_error" });
  }

  const playerName = req.session.name;
  if (getLobbyPlayerCreated(playerName)) {
    return res.status(400).json({ message: "lobby_already_created" });
  }

  if (getLobbyPlayerJoined(playerName)) {
    return res.status(400).json({ message: "lobby_already_joined" });
  }

  const lobby = lobbies.find(lobby => lobby.id == req.body.lobbyId);
  if (!lobby || req.body.lobbyPassword != lobby.password) {
    return res.status(400).json({ message: "incorrect_lobby_input" });
  }

  lobby.players[playerName] = {};

  for (let player in lobby.players) {
    const data = JSON.stringify({ type: "player_joined", players: lobby.players, });
    if (playersSSE.has(player)) {
      playersSSE.get(player).write(`data: ${data}\n\n`);
    }
  }

  const { cards: _cards, phrases: _phrases, ...plainLobby } = lobby;
  res.status(200).json({ location: "lobby", lobby: plainLobby });
});

lobbiesRouter.post("/disconnect", (req, res) => {
  const playerName = req.session.name;

  const lobby = lobbies.find(lobby => {
    if (playerName in lobby.players) {
      return lobby;
    }
  });

  if (!lobby) {
    return res.status(400).json({ message: "You aren't in any lobby to disconnect." });
  }

  let isAuthor = lobby.authorName === playerName;
  if (isAuthor) {
    const data = JSON.stringify({ type: "author_disconnected", players: lobby.players, });
    playersSSE.forEach(playerSSE => playerSSE.write(`data: ${data}\n\n`));
    lobbies.splice(lobbies.indexOf(lobby), 1);
  } else {
    delete lobby.players[playerName];
    const data = JSON.stringify({ type: "player_disconnected", players: lobby.players, });
    playersSSE.forEach(playerSSE => playerSSE.write(`data: ${data}\n\n`));
  }

  const { cards: _cards, phrases: _phrases, ...plainLobby } = lobby;
  return res.status(200).json({ location: "join", lobby: plainLobby });
});

const handleAction = (playerName, data) => {
  const lobby = getLobby(playerName);
  const actions = {
    player_selected_card,
    winning_card_selected,
  };
  actions[data.type](playerName, lobby, data);
};

const player_selected_card = (playerName, lobby, data) => {
  if (playerCanSelectCard(playerName, lobby, data.cardIndex)) {
    // Update data
    const [selectedCard] = lobby.players[playerName].availableCards.splice(data.cardIndex, 1);
    lobby.eventEmitter.emit("update", [playerName], { lobby: { availableCards: lobby.players[playerName].availableCards } });
    lobby.selectedCards[playerName] = selectedCard;
    lobby.eventEmitter.emit("update", Object.keys(lobby.players), { lobby: { selectedCards: Object.values(lobby.selectedCards) } });

    // If all players picked cards -> state_changed to judging
    const allPlayersPickedCards = Object.keys(lobby.selectedCards).length === (Object.keys(lobby.players).length - 1);
    if (allPlayersPickedCards) {
      moveToJudgingStage(lobby);
    }
  }
};

const winning_card_selected = (playerName, lobby, data) => {
  if (hostCanSelectCard(playerName, lobby, data.cardIndex)) {
    // Update data
    clearTimeout(lobby.timeoutId);
    const winnerName = Object.keys(lobby.selectedCards)[data.cardIndex];

    lobby.players[winnerName].score += 1;
    lobby.winnerName = winnerName;
    lobby.winningCardIndex = data.cardIndex;
    lobby.timeRemaining = 5;

    // Notify all players
    const playersToUpdate = [];
    const players = {};
    for (let player in lobby.players) {
      playersToUpdate.push(player);
      players[player] = { score: lobby.players[player].score };
    }

    lobby.eventEmitter.emit("update", playersToUpdate, {
      lobby: {
        winnerName,
        winningCardIndex: data.cardIndex,
        players,
        timeRemaining: 5,
      }
    });

    // 5 second pause before next round
    const onSecondPassed = (lobby) => {
      lobby.timeRemaining -= 1;
      console.log(`Countdown to draft timer: ${lobby.timeRemaining}`);

      if (lobby.timeRemaining > 0) {
        setTimeout(() => onSecondPassed(lobby), 1000);
      } else {
        checkGameOver(lobby);
      }
    };

    setTimeout(() => onSecondPassed(lobby), 1000);
  }
};

// Completed
const initialize = (lobby) => {
  lobby.phrases = shuffle(phrases);
  lobby.cards = shuffle(cards);

  const players = Object.keys(lobby.players);

  lobby.round = 1;
  lobby.roundsToPlay = players.length * 3 + getRandomInteger(1, 3);
  pickPhrase(lobby);
  pickInitialCardsForPlayers(lobby);
  lobby.state = "draft";
  lobby.currentHost = players[getRandomInteger(0, players.length - 1)];
  lobby.timeRemaining = roundDuration;
  lobby.selectedCards = {};
}

// Completed
const moveToJudgingStage = (lobby) => {
  clearTimeout(lobby.timeoutId);
  lobby.state = "judging";
  lobby.timeRemaining = roundDuration;

  lobby.eventEmitter.emit("update", Object.keys(lobby.players), { lobby: {
    state: "judging",
    timeRemaining: roundDuration,
  } });

  const onJudgingStateSecondPassed = (lobby) => {
    if (lobby.timeRemaining > 0) {
      lobby.timeRemaining -= 1;
      lobby.timeoutId = setTimeout(() => onJudgingStateSecondPassed(lobby), 1000);
      return;
    }

    onJudgingStateTimeout(lobby);
  };
  lobby.timeoutId = setTimeout(() => onJudgingStateSecondPassed(lobby), 1000);
};

const checkGameOver = (lobby) => {
  console.log(`Moving to draft stage: ${lobby.round} out of ${lobby.roundsToPlay}`);
  if (lobby.round == lobby.roundsToPlay) {
    lobby.state = "game_over";
    // Get winner
    const winners = [];
    for (let [player, { score }] of Object.entries(lobby.players)) {
      
    }
    lobby.winners = winner;

    lobby.eventEmitter.emit("update", [player], {
      lobby: {
        state: "game_over",
        winners,
      }
    });
  } else {
    moveToDraftStage(lobby);
  }
};

const moveToDraftStage = (lobby) => {
  lobby.winnerName = "";
  lobby.winningCardIndex = -1;

  lobby.state = "draft";
  lobby.selectedCards = {};
  lobby.round += 1;
  lobby.timeRemaining = roundDuration;
  // Assign new phrase
  pickPhrase(lobby);
  // Give players random new cards
  for (let player in lobby.players) {
    if (player == lobby.currentHost) {
      continue;
    }

    const availableCards = lobby.players[player].availableCards;
    const card = lobby.cards.pop();
    availableCards.push(card);
    lobby.cards.unshift(card);

    lobby.eventEmitter.emit("update", [player], {
      lobby: { availableCards, }
    });
  }
  // Assign new host
  const players = Object.keys(lobby.players);
  const currentHostIndex = players.indexOf(lobby.currentHost);
  const newHostIndex = (currentHostIndex + 1) % players.length;
  lobby.currentHost = players[newHostIndex];

  lobby.eventEmitter.emit("update", Object.keys(lobby.players), { lobby: {
    state: "draft",
    selectedCards: [],
    round: lobby.round,
    timeRemaining: roundDuration,
    currentHost: lobby.currentHost,

    winnerName: "",
    winningCardIndex: -1,
  } });

  lobby.timeoutId = setTimeout(() => onDraftStateSecondPassed(lobby), 1000);
};

// 
const onDraftStateTimeout = (lobby) => {
  // Pick random cards from players who have not selected
  for (let player in lobby.players) {
    if (player != lobby.currentHost && !(player in lobby.selectedCards)) {
      const availableCards = lobby.players[player].availableCards;
      const randomIndex = getRandomInteger(0, availableCards.length - 1);
      lobby.selectedCards[player] = availableCards.splice(randomIndex, 1)[0];

      lobby.eventEmitter.emit("update", [player], { lobby: { availableCards } });
      lobby.eventEmitter.emit("update", Object.keys(lobby.players), { lobby: { selectedCards: Object.values(lobby.selectedCards) } });
    }
  }
  
  moveToJudgingStage(lobby);
};

const onDraftStateSecondPassed = (lobby) => {
  if (lobby.timeRemaining > 0) {
    lobby.timeRemaining -= 1;
    lobby.timeoutId = setTimeout(() => onDraftStateSecondPassed(lobby), 1000);
    return;
  }

  onDraftStateTimeout(lobby);
};

const onJudgingStateTimeout = (lobby) => {
  // Select a random card if the host has not done so
  const selectedCards = Object.entries(lobby.selectedCards);
  console.log("Cards: ", selectedCards);
  const winningCardIndex = getRandomInteger(0, selectedCards.length - 1);
  console.log("Winning card index: ", winningCardIndex);
  const winningEntry = selectedCards[winningCardIndex];
  console.log("Winning entry: ", winningEntry);
  const winnerName = winningEntry[0];

  lobby.players[winnerName].score += 1;
  lobby.winnerName = winnerName;
  lobby.winningCardIndex = winningCardIndex;
  lobby.timeRemaining = 5;

  // Transform data
  const players = {};
  for (let player in lobby.players) {
    players[player] = { score: lobby.players[player].score };
  }

  // 
  lobby.eventEmitter.emit("update", Object.keys(players), {
    lobby: {
      winnerName,
      winningCardIndex,
      players,
      timeRemaining: 5,
    }
  });

  // Start countdowm
  const onSecondPassed = (lobby) => {
    lobby.timeRemaining -= 1;
    console.log(`Countdown to draft timer (timeout): ${lobby.timeRemaining}`);
    
    if (lobby.timeRemaining > 0) {
      setTimeout(() => onSecondPassed(lobby), 1000);
    } else {
      checkGameOver(lobby);
    }
  };

  setTimeout(() => onSecondPassed(lobby), 1000);
};

lobbiesRouter.post("/start", (req, res) => {
  const lobby = lobbies.find(lobby => lobby.authorName === req.session.name);
  if (!lobby) {
    return res.status(400).json({ message: "lobby_required" });
  }

  if (Object.keys(lobby.players).length < 3) {
    return res.status(400).json({ message: "not_enough_players" });
  }

  // Initialize the lobby
  initialize(lobby);

  // Send initial data to players
  for (const player in lobby.players) {
    const plainLobby = JSON.parse(JSON.stringify(lobby));

    delete plainLobby.cards;
    delete plainLobby.phrases;

    plainLobby.availableCards = plainLobby.players[player].availableCards;

    for (const _player in plainLobby.players) {
      delete plainLobby.players[_player].availableCards;
    }

    plainLobby.selectedCards = Object.values(plainLobby.selectedCards);

    const data = JSON.stringify({ type: "game_started", lobby: plainLobby });

    if (playersSSE.has(player)) {
      playersSSE.get(player).write(`data: ${data}\n\n`);
    }
  }

  lobby.timeoutId = setTimeout(() => onDraftStateSecondPassed(lobby), 1000);

  res.status(200).json({ message: "The game started." });
});

lobbiesRouter.get("/events", (req, res) => {
  const { lobbyId } = req.query;
  const lobby = lobbies.find(lobby => lobby.id == lobbyId);
  if (!lobby) return res.status(400).json({ message: "Incorrect lobby id." });

  const playerName = req.session.name;
  playersSSE.set(playerName, res);

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();

  req.on('close', () => {
    playersSSE.delete(playerName);
  });
}
);

module.exports = { lobbiesRouter, getLobbyInfo, getLobby, handleAction, };
