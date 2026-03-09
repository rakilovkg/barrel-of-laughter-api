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

function initialize(lobby) {
  lobby.phrases = shuffle(phrases);

  const newPhrase = lobby.phrases.pop();
  lobby.currentPhrase = newPhrase;
  lobby.phrases.unshift(newPhrase);

  lobby.cards = shuffle(cards);
  for (let player in lobby.players) {
    const availableCards = lobby.cards.splice(0, 10);
    lobby.players[player] = { score: 0, availableCards };
    lobby.cards.push(...availableCards);
  }

  lobby.state = "draft";
  lobby.round = 1;
  lobby.currentHost = Object.keys(lobby.players)[0];
  lobby.timeRemaining = 60;
  lobby.selectedCards = {};
}

const moveToJudgingStage = (lobby) => {
  
};

const moveToDraftStage = (lobby) => {
  
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

  for (player in lobby.players) {
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
  let isAuthor = false;

  const lobby = lobbies.find(lobby => {
    if (playerName in lobby.players) {
      return lobby;
    }
  });

  if (!lobby) {
    return res.status(400).json({ message: "You aren't in any lobby to disconnect." });
  }

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

lobbiesRouter.post("/start", (req, res) => {
  const lobby = lobbies.find(lobby => lobby.authorName == req.session.name);
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

  const onSecondPassed = () => {
    console.log(`Lobby time: ${lobby.timeRemaining}`);
    if (lobby.timeRemaining > 0) {
      lobby.timeRemaining -= 1;
      setTimeout(onSecondPassed, 1000);
    } else {
      // TODO: Winning condition
      

      // State change
      switch (lobby.state) {
        case "draft":
          for (let player in lobby.players) {
            if (!(player in lobby.selectedCards)) {
              console.log(`${player} has not selected a card.`);
              const availableCards = lobby.players[player].availableCards;
              const randomIndex = getRandomInteger(0, availableCards.length - 1);
              lobby.selectedCards[player] = availableCards.splice(randomIndex, 1)[0];
            }
          }
          lobby.state = "judging";
          lobby.timeRemaining = 60;
          break;
        case "judging":
          
          lobby.state = "draft";
          lobby.timeRemaining = 60;
          break;
      }

      lobby.eventEmitter.emit("lobby", {
        type: "state_changed",
        lobby: {
          state: lobby.state,
          timeRemaining: lobby.timeRemaining,
          currentHost: lobby.currentHost
        }
      });
    }
  };
  lobby.timeoutId = setTimeout(onSecondPassed, 1000);

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

module.exports = { lobbiesRouter, getLobbyInfo, getLobby, };
