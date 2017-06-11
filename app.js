// https://github.com/tpiros/online-cardgame/blob/master/server.js
const socket = require('socket.io');
const Game = require('./game.js');
const Utils = require('./utils.js');

var http = require('http');
var express = require('express');
var app = express();

app.use('/', express.static(__dirname + "/"));
app.use('/resources', express.static(__dirname + "/resources"));
const server = http.createServer(app);
server.listen(8080);
const io = socket.listen(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});


const words = [
  'ARCHITECTURE', 'VENTILATOR', 'COLLECTOR', 'ANATOMICAL', 'JAZZ',
];
const games = [];
const loggedInUsers = [];
const users = [
  {
    userId: 1,
    username: 'joel',
    password: '',
    ranking: 10,
    inGame: false
  }, {
    userId: 2,
    username: 'test',
    password: '',
    ranking: 5,
    inGame: false
  }, {
    userId: 3,
    username: 'test1',
    password: '',
    ranking: 2,
    inGame: false
  }, {
    userId: 4,
    username: 'test2',
    password: '',
    ranking: 4,
    inGame: false
  }, {
    userId: 5,
    username: 'test3',
    password: '',
    ranking: 2,
    inGame: false
  }, {
    userId: 6,
    username: 'test4',
    password: '',
    ranking: 2,
    inGame: false
  }, {
    userId: 7,
    username: 'test5',
    password: '',
    ranking: 1,
    inGame: false
  }
];

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
    // console.log(data);
    let challenger = getUserById(data.challenger);
    let challenged = getUserById(data.challenged);

    loggedInUsers[challenger.userId - 1].inGame = true;
    loggedInUsers[challenged.userId - 1].inGame = true;
    sendUserList();
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
    let user;
    let sessionObj;
    let authSuccess = false;
    for (let i = 0; i < users.length; i++) {
      user = users[i];
      if (data.username === user.username &&
          data.password === user.password) {
        // todo check if user is already logged in..
        sessionObj = {
          username: user.username,
          userId: user.userId,
          ranking: user.ranking,
          socketId: socket.id,
          inGame: user.inGame
        };
        loggedInUsers.push(sessionObj);
        authSuccess = true;
        break;
      }
    }

    if (authSuccess) {
      io.to(socket.id).emit('logging', {
        message: 'auth success',
      });
      io.to(socket.id).emit('auth success', {
        session: sessionObj
      });
      console.log('auth success');
      io.sockets.emit('logging', {
        message: 'There are ' + loggedInUsers.length + ' users logged in'
      });

      sendUserList();

    } else {
      io.to(socket.id).emit('logging', {
        message: 'auth failure'
      });
      io.to(socket.id).emit('auth failure', {
        message: 'auth failed!'
      });
      console.log('auth failure');
    }
  });

  socket.on('logout', (data) => {
    logoutPlayer(data.session.socketId);

    io.to(data.session.socketId).emit('logging', {
      message: 'Logged out success!'
    });
    io.sockets.emit('logging', {
      message: 'There are ' + loggedInUsers.length + ' users logged in'
    });
    io.to(data.session.socketId).emit('logout success', {
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

const logoutPlayer = (id) => {
  for (let i = 0; i < loggedInUsers.length; i++) {
    user = loggedInUsers[i];
    if (user.socketId == id) {
      deleteGame(id);
      let index = loggedInUsers.indexOf(user);
      loggedInUsers.splice(index, 1);
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
  return words[Math.floor(Math.random() * words.length)];
};

const deleteGame = (socketId) => {
  let index = -1;
  for (let i = 0; i < games.length; i++) {
    let game = games[i];
    if (game.hasPlayer(socketId)) {
      loggedInUsers[game.getPlayerOne().userId - 1].inGame = false;
      loggedInUsers[game.getPlayerOne().userId - 1].inGame = false;
      index = i;
      break;
    }
  }
  console.log(loggedInUsers);
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
  console.log(game.getEndState());
  // update players ranking here
  loggedInUsers[player.userId - 1].inGame = false;
  loggedInUsers[opponent.userId - 1].inGame = false;
  sendUserList();

  if (game.getEndState() == 'won') {
    updateRanking(getUserById(player.userId), 'win');
    updateRanking(getUserById(opponent.userId), 'loss');
    emitToPlayer(player.socketId, 'win', {
      winner: player,
      loser: opponent
    });
    emitToPlayer(opponent.socketId, 'lost', {
      winner: player,
      loser: opponent
    });
    emitToPlayers(game.getPlayers(), 'logging', {
      message: `${player.username} has won!`
    });
  }

  if (game.getEndState() == 'lost-both') {
    updateRanking(getUserById(player.userId), 'loss');
    updateRanking(getUserById(opponent.userId), 'loss');
    emitToPlayers(game.getPlayers(), 'lost-both', {});
    emitToPlayers(game.getPlayers(), 'logging', {
      message: `${player.username} has won!`
    });
  }

  if (game.getEndState() == 'forfeited') {
    console.log('forfeited!!');
    updateRanking(getUserById(player.userId), 'loss');
    updateRanking(getUserById(opponent.userId), 'win');

    emitToPlayers(game.getPlayers(), 'game stop', {
      reason: 'forfeit',
      winner: opponent,
      loser: player
    });
    emitToPlayers(game.getPlayers(), 'logging', {
      message: `${player.username} forfeited thus ${opponent.username} wins!`
    });
  }
  loggedInUsers[player.userId - 1].inGame = false;
  loggedInUsers[opponent.userId - 1].inGame = false;
  sendUserList();
  deleteGame(player.socketId);
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
