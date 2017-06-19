const socket = require('socket.io');
const Game = require('./game.js');
const Utils = require('./utils.js');
const fs = require('fs');
const readline = require('readline');
const axios = require('axios');

const http = require('http');
const express = require('express');
const app = express();

app.use('/', express.static(__dirname + "/"));
app.use('/resources', express.static(__dirname + "/resources"));
const server = http.createServer(app);
server.listen(8080);
const io = socket.listen(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const filename = './words.txt';
const rl = readline.createInterface({
  input: fs.createReadStream(filename)
});

global.words = [];
rl.on('line', (line) => {
  let temp = line.split(', ');
  for (let i = 0; i < temp.length; i++) {
    global.words.push(temp[i]);
  }
});

const games = [];
const loggedInUsers = [];

io.sockets.on('connection', (socket) => {
  console.log('a socket connected');
  sendUserList();
  io.sockets.emit('logging', {
    message: 'a new socket is connected'
  });

  socket.on('forfeit', () => {
    let game = getGame(socket.id);
    let player = game.getPlayer(socket.id);
    let opponent = game.getOpponent(player);
    game.forfeit(player);
    handleFinishedGame(game, player, opponent);
  });

  socket.on('i know the word', (data) => {
    // todo add validation if player can really do this!
    let game = getGame(socket.id);
    let player = game.getPlayer(socket.id);
    // let user = getUserById(player.userId);
    let opponent = game.getOpponent(player);

    game.guessWord(data.word.toUpperCase());
    let gameState = game.getState();
    emitToPlayers(game.getPlayers(), 'game update', gameState);

    if (game.isEnded()) {
      handleFinishedGame(game, player, opponent);
    } else {
      handleTurn(player, opponent);
    }
  });

  socket.on('challenge user', (data) => {
    let challenger = getUserById(data.challenger);
    let challenged = getUserById(data.challenged);

    challenger.inGame = true;
    challenged.inGame = true;
    updatePlayStatus(challenger, challenged, true);

    // lets create a game for the two players if they are NOT currently IN a game
    let game = new Game();
    game.addWord(getRandomWord());
    game.addPlayer(challenger);
    game.addPlayer(challenged);
    game.start();
    games.push(game);

    emitToPlayers(game.getPlayers(), 'game start', {
      gameState: game.getState()
    });
  });

  socket.on('check letter', (data) => {
    let game = getGame(socket.id);
    // todo add validation if player can really do this!
    game.addLetter(data.letter);
    let gameState = game.getState();
    emitToPlayers(game.getPlayers(), 'game update', gameState);

    let player = game.getPlayer(socket.id);
    let opponent = game.getOpponent(player);

    let gameIsFinished = game.isEnded();
    if (!gameIsFinished) {
      handleTurn(player, opponent);
    } else {
      handleFinishedGame(game, player, opponent);
    }
  });

  // handles login
  socket.on('auth', (data) => {
    authenticate(data.username, data.password, socket.id);
  });

  socket.on('logout', (data) => {
    logoutPlayer(socket.id);

    io.to(socket.id).emit('logging', {
      message: 'Logged out success!'
    });
    io.sockets.emit('logging', {
      message: 'There are ' + loggedInUsers.length + ' users logged in'
    });
    io.to(socket.id).emit('logout success', {
      socketId: socket.id
    });
    sendUserList();
  })

  socket.on('disconnect', () => {
    logoutPlayer(socket.id);
    io.sockets.emit('logging', {
      message: 'a socket disconnected'
    });
    console.log('a socket disconnected');
    sendUserList();
  });
});

const forfeitGame = (socketId) => {
  let game = getGame(socketId);
  if (game != null) {
    let player = game.getPlayer(socketId);
    let opponent = game.getOpponent(player);
    game.forfeit(player);
    handleFinishedGame(game, player, opponent);
  }
};

const sendUserList = () => {
  io.sockets.emit('user list update', {
    users: loggedInUsers
  });
};

const getUserById = (id) => {
  for (let i = 0; i < loggedInUsers.length; i++) {
    user = loggedInUsers[i];
    if (user.userId === id) {
      return user;
    }
  }
  return null;
};

const logoutPlayer = (socketId) => {
  for (let i = 0; i < loggedInUsers.length; i++) {
    user = loggedInUsers[i];
    let username = user.username;
    if (user.socketId == socketId) {
      forfeitGame(socketId);
      deleteGame(socketId);

      // let index = getLoggedInUserIndex(user.userId);
      // loggedInUsers.splice(index, 1);
      // let username = user.username;
      console.log(`logout success - ${username}`);
      loggedInUsers.splice(i, 1);
      sendUserList();
      break;
    }
  }
}

const emitToPlayer = (socketId, event, data) => {
  io.to(socketId).emit(event, data);
};

const emitToPlayers = (players, event, data) => {
  for(let i = 0; i < players.length; i++) {
    emitToPlayer(players[i].socketId, event, data);
  }
};

const getRandomWord = () => {
  let word = global.words[Math.floor(Math.random() * global.words.length)];
  return word;
};

const deleteGame = (socketId) => {
  let index = -1;
  for (let i = 0; i < games.length; i++) {
    let game = games[i];
    if (game.hasPlayer(socketId)) {
      updatePlayStatus(game.getPlayerOne(), game.getPlayerTwo(), false);
      index = i;
      break;
    }
  }
  games.splice(index, 1);
};

const getGame = (socketId) => {
  let game = null;
  for (let i = 0; i < games.length; i++) {
    let temp = games[i];
    if (temp.hasPlayer(socketId)) {
      game = temp;
      break;
    }
  }
  return game;
};

const resetClient = () => {
  io.sockets.emit('reset ui');
};

const handleFinishedGame = (game, player, opponent) => {
  updatePlayStatus(player, opponent, false);

  if (game.getEndState() == 'won') {
    updateRanking(getUserById(player.userId), 'win');
    updateRanking(getUserById(opponent.userId), 'loss');
    emitToPlayer(player.socketId, 'win', {
      winner: player,
      loser: opponent,
      losers: [],
      game: {
        attempts: game.guessAttempts,
        word: game.word,
        endState: game.getEndState(),
        playedLetters: game.playedLetters,
        incorrectLetters: game.incorrectLetters,
        correctLetters: game.correctLetters,
        notUsedLetters: game.notUsedLetters,
        wordIsGuessed: game.wordIsGuessed,
        outputString: game.outputString,
        forfeited: game.forfeited
      }
    });
    emitToPlayer(opponent.socketId, 'lost', {
      winner: player,
      loser: opponent,
      losers: [],
      game: {
        attempts: game.guessAttempts,
        word: game.word,
        endState: game.getEndState(),
        playedLetters: game.playedLetters,
        incorrectLetters: game.incorrectLetters,
        correctLetters: game.correctLetters,
        notUsedLetters: game.notUsedLetters,
        wordIsGuessed: game.wordIsGuessed,
        outputString: game.outputString,
        forfeited: game.forfeited
      }
    });
    emitToPlayers(game.getPlayers(), 'logging', {
      message: `${player.username} has won!`
    });
  }

  if (game.getEndState() == 'lost-both') {
    updateRanking(getUserById(player.userId), 'loss');
    updateRanking(getUserById(opponent.userId), 'loss');
    emitToPlayers(game.getPlayers(), 'lost-both', {
      winner: null,
      loser: null,
      losers: [player, opponent],
      game: {
        attempts: game.guessAttempts,
        word: game.word,
        endState: game.getEndState(),
        playedLetters: game.playedLetters,
        incorrectLetters: game.incorrectLetters,
        correctLetters: game.correctLetters,
        notUsedLetters: game.notUsedLetters,
        wordIsGuessed: game.wordIsGuessed,
        outputString: game.outputString,
        forfeited: game.forfeited
      }
    });
    emitToPlayers(game.getPlayers(), 'logging', {
      message: `You both have lost..`
    });
  }

  if (game.getEndState() == 'forfeited') {
    updateRanking(getUserById(player.userId), 'loss');
    updateRanking(getUserById(opponent.userId), 'win');

    emitToPlayers(game.getPlayers(), 'game stop', {
      reason: 'forfeit',
      winner: opponent,
      loser: player,
      losers: [],
      game: {
        attempts: game.guessAttempts,
        word: game.word,
        endState: game.getEndState(),
        playedLetters: game.playedLetters,
        incorrectLetters: game.incorrectLetters,
        correctLetters: game.correctLetters,
        notUsedLetters: game.notUsedLetters,
        wordIsGuessed: game.wordIsGuessed,
        outputString: game.outputString,
        forfeited: game.forfeited
      }
    });
    emitToPlayers(game.getPlayers(), 'logging', {
      message: `${player.username} forfeited thus ${opponent.username} wins!`
    });
  }
  updatePlayStatus(player, opponent, false);
  deleteGame(player.socketId);
};

const updatePlayStatus = (playerOne, playerTwo, state) => {
  playerOne.inGame = state;
  playerTwo.inGame = state;
  sendUserList();
};

const updateRanking = (player, state) => {
  if (state == 'win') {
    player.ranking += 1;
  }

  if (state == 'loss') {
    player.ranking -= 1;
  }
};

const handleTurn = (player, opponent) => {
  emitToPlayer(player.socketId, 'turn', {
    myTurn: false
  });
  emitToPlayer(player.socketId, 'logging', {
    message: 'It is your opponents turn'
  });
  emitToPlayer(opponent.socketId, 'turn', {
    myTurn: true
  });
  emitToPlayer(opponent.socketId, 'logging', {
    message: 'It is your turn'
  });
};

const authenticate = (username, password, socketId) => {
  const api = 'http://localhost:5000/api/v1-0/token';
  const headers = {
    auth: {
      username: username,
      password: password
    }
  };

  const req = axios.get(api, headers)
    .then((res) => {
      loginSuccess(res.data.token, res.data.user, socketId)
    })
    .catch((err) => {
      console.log(err);
      console.log(`token request for ${username} failed`);
    });
}

const loginSuccess = (token, user, socketId) => {
  // console.log(user);
  let sessionObj = {
    userId: user.id,
    username: user.username,
    ranking: 10,
    inGame: false,
    socketId: socketId,
    description: user.description,
    picture_url: user.picture_url
  }

  loggedInUsers.push(sessionObj);
  io.to(socketId).emit('logging', {
    message: `auth success - ${user.username} is logged in.`,
  });
  io.to(socketId).emit('auth success', {
    session: sessionObj
  });

  console.log(`auth success - ${sessionObj.username}`);
  io.sockets.emit('logging', {
    message: 'There are ' + loggedInUsers.length + ' users logged in'
  });

  sendUserList();
}

const getLoggedInUserIndex = (userId) => {
  for (let i = 0; i < loggedInUsers.length; i++) {
    if (loggedInUsers.userId === userId) {
      return i;
    }
  }
  return -1;
}
