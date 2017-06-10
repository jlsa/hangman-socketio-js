// https://github.com/tpiros/online-cardgame/blob/master/server.js
const socket = require('socket.io');
const Game = require('./game.js');

var http = require('http');
var express = require('express');
var app = express();

app.use('/', express.static(__dirname + "/"));

const server = http.createServer(app);
server.listen(8080);
const io = socket.listen(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const words = [
  'AAN', 'DANS', 'SCHOOL', 'FIETS', 'LAPTOP',
  'MAN', 'PLANT', 'MUIS', 'RAT', 'TELEVISIE',
  'VROUW', 'KAST', 'AREND', 'KOE', 'BANK',
  'VENTILATOR', 'HOND', 'VOGEL', 'KIP', 'AAP'
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
  io.sockets.emit('logging', {
    message: 'a new socket is connected'
  });

  socket.on('challenge user', (data) => {
    // console.log(data);
    let challenger = getUserById(data.challenger);
    let challenged = getUserById(data.challenged);
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
    // console.log('check letter', data);
    game.addLetter(data.letter);
    let gameState = game.getState();
    // console.log('gamestate', gameState);
    emitToPlayers(game.getPlayers(), 'update gamestate', gameState);

    let player = game.getPlayer(socket.id);
    let opponent = game.getOpponent(player);

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
      message: 'it is turn'
    });
  });

  // handles login
  socket.on('auth', (data) => {
    // console.log(data);
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
  for (let i = 0; i < loggedInUsers.length; i++) {
    io.to(loggedInUsers[i].socketId).emit('user list update', {
      users: loggedInUsers
    });
  }
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
      // console.log('--- logged in user ---');
      // console.log(user);
      let index = loggedInUsers.indexOf(user);
      loggedInUsers.splice(index, 1);
      // console.log('-----');
      break;
    }
  }
}

const emitToPlayer = (socketId, event, data) => {
  // console.log(`emitting '${event}' to ${socketId}`, data);
  io.to(socketId).emit(event, data);
};

const emitToPlayers = (players, event, data) => {
  for(let i = 0; i < players.length; i++) {
    emitToPlayer(players[i].socketId, event, data);
  }
};

const getRandomWord = () => {
  return words[0];
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
