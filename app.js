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
  'aan', 'dans', 'school', 'fiets', 'laptop',
  'man', 'plant', 'muis', 'rat', 'televisie',
  'vrouw', 'kast', 'arend', 'koe', 'bank',
  'ventilator', '', 'vogel', 'kip', 'aap'
];
const games = [];
let game;
const loggedInUsers = [];
const users = [
  {
    userId: 1,
    username: 'joel',
    password: 'a',
    ranking: 10,
    inGame: false
  }, {
    userId: 2,
    username: 'test',
    password: 'a',
    ranking: 5,
    inGame: false
  }, {
    userId: 3,
    username: 'test1',
    password: 'a',
    ranking: 2,
    inGame: false
  }, {
    userId: 4,
    username: 'test2',
    password: 'a',
    ranking: 4,
    inGame: false
  }, {
    userId: 5,
    username: 'test3',
    password: 'a',
    ranking: 2,
    inGame: false
  }, {
    userId: 6,
    username: 'test4',
    password: 'a',
    ranking: 2,
    inGame: false
  }, {
    userId: 7,
    username: 'test5',
    password: 'a',
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
    console.log(data);
    let challenger = getUserById(data.challenger);
    let challenged = getUserById(data.challenged);
    // lets create a game for the two players if they are NOT currently IN a game
    game = new Game();
    game.addPlayer(challenger);
    game.addPlayer(challenged);
    let players = game.getPlayers();
    games.push(game);
    emitToPlayers(players, 'game start', {
      playerOne: players[0],
      playerTwo: players[1]
    });
  });

  // handles login
  socket.on('auth', (data) => {
    console.log(data);
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
          socketId: socket.id
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

  // setTimeout(() => {
  //   let table = room.getTable(1);
  //   io.sockets.emit('test', {
  //     players: table.players,
  //     socketId: socket.id,
  //   })
  // }, 1000);
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
      console.log('--- logged in user ---');
      console.log(user);
      let index = loggedInUsers.indexOf(user);
      loggedInUsers.splice(index, 1);
      console.log('-----');
      break;
    }
  }
}

const emitToPlayer = (socketId, event, data) => {
  io.to(socketId).emit(event, data);
};

const emitToPlayers = (players, event, data) => {
  for(let i = 0; i < players.length; i++) {
    io.to(players[i].socketId).emit(event, data);
  }
};
