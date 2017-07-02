const socket = io({transports: ['websocket'], upgrade: false});//.connect('http://localhost:8080');
let session = null;
let loggedInUsers;

let playerOne;
let playerTwo;
let myTurn = false;
let gameState;
let finished = false;
let won = false;

let alertCount = 0;

socket.on('logging', (data) => {
  $('#updates').append('<li class="updates-item">' + data.message + '</li>');
  // let log = document.getElementById('footer');
  console.log(`SERVER: ${data.message}`);
  // log.scrollTop = log.scrollHeight;
});



$(document).ready(() => {
  init();

  $('#close-end-game-element').on('click', (e) => {
    $('#end-game-element').hide();
  });

  $("#forfeit-button").on('click', (e) => {
    socket.emit('forfeit');
  });

  $("#logout").on('click', (e) => {
    socket.emit('logout', {
      session: session
    });
    session = null;
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

  socket.on('update ranking', (data) => {
    $('#profile-ranking').html(`Ranking: ${data.ranking}`);
  });

  socket.on('reset ui', () => {
    init();
  });

  socket.on('win', (data) => {
    updateEndGameElement(data);
    showAlert('WIN', 'Congratulations, you have won!!', 5000);

    session.inGame = false;
  });

  socket.on('lost-both', (data) => {
    updateEndGameElement(data);
    showAlert('LOST', 'Too bad, you both lost!', 5000);
    session.inGame = false;
  });

  socket.on('lost', (data) => {
    updateEndGameElement(data);
    showAlert('LOST', 'Too bad, you have lost! Better luck next time.', 5000);
    session.inGame = false;
  });

  socket.on('forfeited', (data) => {
    updateEndGameElement(data);
    showAlert('FORFEITED', `${session.username} why did you give up? Now you've lost! :(`, 5000);
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
          // $userList.append(`<li>${user.username}(${user.ranking})</li>`);
          $userList.append(`
            <li class="collection-item avatar">
              <img src="${user.picture_url}" alt="" class="circle">
              <span class="title">@${user.username}</span>
              <p class="teal-text">Ranking: ${user.ranking}</p>
            </li>
          `);
        } else {
          if (user.inGame) {
            $userList.append(`
              <li class="collection-item avatar">
                <img src="${user.picture_url}" alt="" class="circle">
                <span class="title">@${user.username}</span>
                <p class="teal-text">Ranking: ${user.ranking}</p>
              </li>
            `);
          } else {
            $userList.append(`
              <li class="collection-item avatar">
                <img src="${user.picture_url}" alt="" class="circle">
                <span class="title">@${user.username}</span>
                <p class="teal-text">Ranking: ${user.ranking}</p>
                <a href="#!" onclick="challengeUser(${user.userId})"
                  class="secondary-content"><i class="material-icons">play_circle_outline</i></a>
              </li>
            `);
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
    $('#login-element').hide();
    $('#lobby-element').show();
    $('#profile-picture').attr('src', data.session.picture_url);
    $('#profile-username').text(`@${data.session.username}`);
    $('#profile-description').html(`<p>${data.session.description}</p>`);
    $('#profile-ranking').html(`Ranking: ${data.session.ranking}`);
    session = data.session;
  });

  socket.on('auth failure', (data) => {
    // console.log(data);
  });

  socket.on('logout success', (data) => {
    logout();
    session = null;
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

const showAlert = (title, msg, duration = 1000) => {
  let el = document.createElement('div');
  el.innerHTML = `
      <div class="card deep-orange">
        <div class="card-content black-text">
          <span class="card-title">${title}</span>
          <p>${msg}</p>
        </div>
      </div>
    </div>
  `;
  setTimeout(() => {
    // console.log(alertCount);
    alertCount--;
    // console.log(alertCount);
    if (alertCount <= 0) {
      $('#alert-box').hide();
    }
    el.parentNode.removeChild(el);
  }, duration);

  alertCount++;
  $('#alert-box').show();
  document.getElementById('alert-box').appendChild(el);
}

const init = () => {
  $('#end-game-winner-label').hide();
  $('#end-game-losers-label').hide();
  $('#end-game-loser-label').hide();

  $('#lobby-element').hide();
  $('#game-element').hide();
  $('#end-game-element').hide();
  $('#debug-element').hide();
  $('#alert-box').hide();
  $('#login-element').show();

  $( 'form' ).on('submit', (e) => {
    e.preventDefault();
  });
};

const logout = () => {
  init();
  session = null;
};

const updateEndGameElement = (data) => {
  $('#game-element').hide();
  $('#lobby-element').show();
  $('#end-game-element').show();
  console.log(data);

  let winner = data.winner;
  let loser = data.loser;
  let losers = data.losers;
  let game = data.game;
  session.inGame = false;

  let attempts = data.game.attempts;
  let word = data.game.word;
  let endState = data.game.endState;
  let playedLetters = data.game.playedLetters;
  let incorrectLetters = data.game.attempts;
  let correctLetters = data.game.correctLetters;
  let notUsedLetters = data.game.notUsedLetters;
  let wordIsGuessed = data.game.wordIsGuessed;
  let outputString = data.game.outputString;
  let forfeited = data.game.forfeited;

  $('#end-attempts').text(attempts);
  $('#end-word').text(word);

  // $('#end-played-letters').text(playedLetters);
  // $('#end-correct-letters').text(correctLetters);
  // $('#end-incorrect-letters').text(incorrectLetters);
  // $('#end-word-is-guessed').text();
  // $('#end-forfeited').text('');

  if (endState === 'forfeited') {
    if (session.username === winner.username) {
      $('#end-game-state').text('Your opponent forfeited');
    } else {
      $('#end-game-state').text('You forfeited');
    }

  }

  $winner = $('#end-game-winner');
  $winner.hide();
  $loser = $('#end-game-loser');
  $loser.hide();
  $losers = $('#end-game-losers');
  $losers.hide();

  $('#end-game-winner-label').hide();
  $('#end-game-losers-label').hide();
  $('#end-game-loser-label').hide();

  if (winner != null) {
    $winner.show();
    $('#end-game-winner-label').show();
    $winner.html(`@${winner.username}`)
  } else {
    $winner.html('');
    $winner.hide();
  }

  if (loser != null) {
    $('#end-game-loser-label').show();
    $loser.show();
    $loser.html(`@${loser.username}`)
  } else {
    $loser.html('');
    $loser.hide();
  }

  if (losers.length > 0) {
    $('#end-game-losers-label').show();
    $losers.html('');
    $losers.show();
    for (let i = 0; i < losers.length; i++) {
      $losers.append(`<div class="col">@${losers[i].username}</div>`);
    }
  } else {
    $losers.html('');
    $losers.hide();
  }


};

const gameStop = (data) => {
  updateEndGameElement(data);

  let winner = data.winner;
  let loser = data.loser;
  session.inGame = false;

  $('.challengeUserBtn').show();
  $('#game-element').hide();
  $('#i-know-the-word').attr('value', '');

  if (winner.userId === session.userId) {
    if (data.reason == 'forfeit') {
      showAlert('FORFEITED', `<strong>@${winner.username}</strong> has won because your opponent <strong>@${loser.username}</strong> has forfeited the game.`, 5000);
    }
  }
  if (loser.userId === session.userId) {
    if (data.reason == 'forfeit') {
      showAlert('FORFEITED', `<strong>@${winner.username}</strong> has won because you forfeited the game.`, 5000);
    }
  }
};

const gameStart = (data) => {
  myTurn = false;
  gameState = data.gameState;
  $('#game-element').show();
  $('#lobby-element').hide();
  $('#end-game-element').hide();

  $('.challengeUserBtn').hide();

  $('.showPlayerName').text(session.username);
  session.inGame = true;

  $userList = $('#playersInGame');
  $userList.html('');
  $userList.append(`<li>Player One: ${data.gameState.playerOne.username}</li>`);
  $userList.append(`<li>Player Two: ${data.gameState.playerTwo.username}</li>`);

  playerOne = data.gameState.playerOne;
  playerTwo = data.gameState.playerTwo;
  $('#playerOneName').text(playerOne.username);
  $('#playerTwoName').text(playerTwo.username);

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
  console.log(gameState)
  renderButtons(gameState.notUsedLetters);
  console.log(`the word is: ${word}`);
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
        letter: $target.text()
      });
      myTurn = false;
    }
  });
};

const renderButtons = (alphabet) => {
  $alphabetButtons = $('#alphabet-buttons');
  $alphabetButtons.html('');

  for (let i = 0; i < alphabet.length; i++) {
    $alphabetButtons.append(`
      <button class="btn btn-primary btn-xs alphabet-button"
        value="${alphabet[i]}">${alphabet[i]}</button>`);
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
    $('#game-input').show();
    $('#game-opponents-turn').hide();
  } else {
    $('#game-input').hide();
    $('#game-opponents-turn').show();
  }
}

const guessTheWord = () => {
  if (myTurn) {
    let theWord = $('#i-know-the-word').val();
    socket.emit('i know the word', {
      word: theWord
    });
  }
}
