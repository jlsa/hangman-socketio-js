const socket = io({transports: ['websocket'], upgrade: false});//.connect('http://localhost:8080');
let session;
let loggedInUsers;

let playerOne;
let playerTwo;
let myTurn = false;
let gameState;
let finished = false;
let won = false;

socket.on('logging', (data) => {
  $('#updates').append('<li>' + data.message + '</li>');
  let log = document.getElementById('footer');
  log.scrollTop = log.scrollHeight;
});

const init = () => {
  $('#endGameMessage').hide();
  $('#loggedIn').hide();
  $('#game').hide();
  $('#content').hide();
  $('form').submit((event) => {
    event.preventDefault();
  });
};

$(document).ready(() => {
  init();
  $('#login-form').submit((event) => {
    event.preventDefault();
    let $inputs = $('#login-form :input');

    let values = {};
    $inputs.each(function() {
      values[this.name] = $(this).val();
    });

    socket.emit('auth', {
      username: values.username,
      password: values.password
    });
  });

  socket.on('win', (data) => {
    console.log('CONGRATS! YOU HAVE WON!');
    $('#game').hide();
    $('#content').hide();
    $('#endGameMessage').show();
    $('#endGameMessage').text('Congratulations, you have won!!');
    session.inGame = false;
  });

  socket.on('lost', (data) => {
    console.log('Too bad! Better luck next time.');
    $('#game').hide();
    $('#content').hide();
    $('#endGameMessage').show();
    $('#endGameMessage').text('Too bad, you have lost! Better luck next time.');
    session.inGame = false;
  });

  socket.on('user list update', (data) => {
    // console.log(data);
    loggedInUsers = data.users;
    $userList = $('#users-list');
    $userList.html('');

    for (let i = 0; i < data.users.length; i++) {
      let user = data.users[i];

      if (session.userId === user.userId) {
        $userList.append(`<li>${user.username}(${user.ranking})</li>`);
      } else {
        if (user.inGame) {
          $userList.append(`<li>${user.username}(${user.ranking})</li>`);
        } else {
          $userList.append(`<li>${user.username}(${user.ranking})
            <button class="btn btn-warning btn-xs challengeUserBtn"
              onclick="challengeUser(${user.userId})">Challenge</button>
          </li>`);
        }
      }
    }
  });

  socket.on('auth success', (data) => {
    // console.log(data);
    $('#login-form').hide();
    $('#loggedIn').show();
    $('#users-list').show();
    session = data.session;
  });

  socket.on('auth failure', (data) => {
    // console.log(data);
  });

  $("#logout").on('click', (e) => {
    socket.emit('logout', {
      session: session
    });
  });

  socket.on('logout success', (data) => {
    $('#loggedIn').hide();
    $('#login-form').show();
    $('#users-list').hide();
    $('#content').hide();
  });

  socket.on('game start', (data) => {
    // console.log(data);
    gameStart(data);
    handleTurnMessage();
  });

  socket.on('turn', (data) => {
    myTurn = data.myTurn;
    handleTurnMessage();
  });

  socket.on('update gamestate', (data) => {
    updateGameState(data);
  });
});

const gameStart = (data) => {
  gameState = data.gameState;
  $('.challengeUserBtn').hide();
  $('#game').show();
  $('#content').show();
  $('#endGameMessage').hide();
  $('.showPlayerName').text(session.username);
  session.inGame = true;

  $userList = $('#playersInGame');
  $userList.html('');
  $userList.append(`<li>Player One: ${data.gameState.playerOne.username}</li>`);
  $userList.append(`<li>Player Two: ${data.gameState.playerTwo.username}</li>`);

  playerOne = data.gameState.playerOne;
  playerTwo = data.gameState.playerTwo;

  if (playerOne.username === session.username) {
    myTurn = true;
  }

  updateGameState(data.gameState);
};

const updateGameState = (gameState) => {
  let letters = gameState.letters;
  let lettersCorrect = gameState.lettersCorrect;
  let notUsedLetters = gameState.notUsedLetters;
  let playedLetters = gameState.playedLetters;
  let word = gameState.word;
  let outputString = gameState.outputString;
  renderButtons(gameState.notUsedLetters);

  // usedLetters
  $usedLetters = $('#usedLetters');
  $usedLetters.html(playedLetters.join(' - '));

  $('#word').text(outputString);

  $('.alphabet-button').click((e) => {
    if (myTurn) {
      let $target = $(e.target);
      socket.emit('check letter', {
        player: session,
        letter: $target.val()
      });
      myTurn = false;
    }
  });
};

const renderButtons = (alphabet) => {
  $alphabetButtons = $('#alphabet-buttons');
  $alphabetButtons.html('');
  for (let i = 0; i < alphabet.length; i++) {
    $alphabetButtons.append(`<button class="btn btn-primary btn-xs alphabet-button" value="${alphabet[i]}">${alphabet[i]}</button>`);
  }
}

const challengeUser = (id) => {
  socket.emit('challenge user', {
    challenger: session.userId,
    challenged: id
  });
}

const handleTurnMessage = () => {
  if (myTurn) {
    $('#turnIndicator').text('Your turn!');
  } else {
    $('#turnIndicator').text('Your opponent\'s turn.');
  }
}
