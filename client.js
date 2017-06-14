const socket = io({transports: ['websocket'], upgrade: false});//.connect('http://localhost:8080');
let session = null;
let loggedInUsers;

let token = null;

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
  $("#logout").on('click', (e) => {
    socket.emit('logout', {
      session: session
    });
  });

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

  socket.on('reset ui', () => {
    init();
  });

  socket.on('win', (data) => {
    console.log('CONGRATS! YOU HAVE WON!');
    $('#game').hide();
    $('#content').hide();
    $('#endGameMessage').show();
    $('#endGameMessage').text('Congratulations, you have won!!');
    session.inGame = false;
  });

  socket.on('lost-both', (data) => {
    console.log('Oh you both lost!');
    $('#game').hide();
    $('#content').hide();
    $('#endGameMessage').show();
    $('#endGameMessage').text('Too bad, you both lost!');
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

  socket.on('forfeited', (data) => {
    console.log('Why did you give up?');
    $('#game').hide();
    $('#content').hide();
    $('#endGameMessage').show();
    $('#endGameMessage').text(`${session.username} why did you give up? Now you've lost! :(`);
    session.inGame = false;
  });

  socket.on('user list update', (data) => {
    // console.log(data);
    loggedInUsers = data.users;
    if (loggedInUsers.length == 0) {
      return;
    }
    $userList = $('#users-list');
    $userList.html('');
    if (session !== null) {
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
    } else {
      for (let i = 0; i < data.users.length; i++) {
        let user = data.users[i];
        $userList.append(`<li>${user.username}(${user.ranking})</li>`);
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

  socket.on('logout success', (data) => {
    $('#loggedIn').hide();
    $('#login-form').show();
    $('#users-list').hide();
    $('#content').hide();
  });

  socket.on('game start', (data) => {
    gameStart(data);

  });

  socket.on('game stop', (data) => {
    let reason = data.reason;
    gameStop(data);
  });

  socket.on('game update', (data) => {
    updateGameState(data);
  })

  socket.on('turn', (data) => {
    myTurn = data.myTurn;
    handleTurnMessage();
  });
});

const gameStop = (data) => {
  let winner = data.winner;
  let loser = data.loser;
  session.inGame = false;
  $('.challengeUserBtn').show();
  $('#game').hide();
  $('#content').hide();
  $('#endGameMessage').show();
  if (winner.userId === session.userId) {
    if (data.reason == 'forfeit') {
      $('#endGameMessage').text(`${winner.username} has won because your opponent ${loser.username} has forfeited the game.`);
    } else {
      $('#endGameMessage').text(`.. game has stopped ..`);
    }
  }
  if (loser.userId === session.userId) {
    if (data.reason == 'forfeit') {
      $('#endGameMessage').text(`${winner.username} has won because you forfeited the game.`);
    } else {
      $('#endGameMessage').text(`.. game has stopped ..`);
    }
  }
};

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
  handleTurnMessage();
};

const updateGameState = (gameState) => {
  let letters = gameState.letters;
  let lettersCorrect = gameState.lettersCorrect;
  let notUsedLetters = gameState.notUsedLetters;
  let playedLetters = gameState.playedLetters.sort();
  let guessAttempts = gameState.guessAttempts;
  let word = gameState.word;
  let outputString = gameState.outputString;
  renderButtons(gameState.notUsedLetters);

  $('#guesses').text(guessAttempts);
  $('#guessesImage').attr('src', `resources/bars-${guessAttempts}.jpg`)

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

const guessTheWord = () => {
  if (myTurn) {
    let theWord = $('#i-know-the-word').val();
    // console.log(`Lets see if it is '${theWord}'.`);
    socket.emit('i know the word', {
      word: theWord
    });
  }
}

const forfeit = () => {
  socket.emit('forfeit');
};
