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
    console.log(alertCount);
    alertCount--;
    console.log(alertCount);
    if (alertCount <= 0) {
      $('#alert-box').hide();
    }
    el.parentNode.removeChild(el);
  }, duration);

  alertCount++;
  $('#alert-box').show();
  document.getElementById('alert-box').appendChild(el);
}


socket.on('logging', (data) => {
  $('#updates').append('<li class="updates-item">' + data.message + '</li>');
  // let log = document.getElementById('footer');
  console.log(`SERVER: ${data.message}`);
  // log.scrollTop = log.scrollHeight;
});

const init = () => {
  $('#lobby-element').hide();
  $('#game-element').hide();
  $('#end-game-element').hide();
  $('#debug-element').show();
  $('#alert-box').hide();
  // $('#endGameMessage').hide();
  // $('#endGameMessage').html('');
  // $('#loggedIn').hide();
  // $('#game').hide();
  // $('#content').hide();
  $( 'form' ).on('submit', (e) => {
    e.preventDefault();
  })
  // $('form').submit((event) => {
  //   event.preventDefault();
  // });
};

$( document ).ready(() => {
  $( window ).on('resize', () => {
    console.log($( window ).width());
  })
  init();

  $( "#forfeit-button" ).on('click', (e) => {
    socket.emit('forfeit');
  });
  $( "#logout" ).on('click', (e) => {
    socket.emit('logout', {
      session: session
    });
  });

  $( '#login-form' ).submit((event) => {
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
    $('#game-element').hide();
    // $('#end-game-element').show();
    updateEndGameElement(data);
    // $('#game').hide();
    // $('#content').hide();
    showAlert('WIN', 'Congratulations, you have won!!', 5000);
    // $('#endGameMessage').show();
    // $('#endGameMessage').text('Congratulations, you have won!!');
    session.inGame = false;
  });

  socket.on('lost-both', (data) => {
    console.log('Oh you both lost!');
    $('#game-element').hide();
    // $('#end-game-element').show();
    updateEndGameElement(data);
    // $('#game').hide();
    // $('#content').hide();
    showAlert('LOST', 'Too bad, you both lost!', 5000);
    // $('#endGameMessage').show();
    // $('#endGameMessage').text('Too bad, you both lost!');
    session.inGame = false;
  });

  socket.on('lost', (data) => {
    console.log('Too bad! Better luck next time.');
    $('#game-element').hide();
    // $('#end-game-element').show();
    updateEndGameElement(data);

    // $('#game').hide();
    // $('#content').hide();
    showAlert('LOST', 'Too bad, you have lost! Better luck next time.', 5000);
    // $('#endGameMessage').show();
    // $('#endGameMessage').text('Too bad, you have lost! Better luck next time.');
    session.inGame = false;
  });

  socket.on('forfeited', (data) => {
    console.log('Why did you give up?');
    $('#game-element').hide();
    // $('#end-game-element').show();
    updateEndGameElement(data);

    // $('#game').hide();
    // $('#content').hide();

    showAlert('FORFEITED', `${session.username} why did you give up? Now you've lost! :(`, 5000);
    // $('#endGameMessage').show();
    // $('#endGameMessage').text(`${session.username} why did you give up? Now you've lost! :(`);
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
              <img src="https://api.adorable.io/avatars/face/eyes7/nose4/mouth9/ff6600" alt="" class="circle">
              <span class="title">@${user.username}</span>
              <p class="teal-text">Ranking: ${user.ranking}</p>
            </li>
          `);
        } else {
          if (user.inGame) {
            // $userList.append(`<li>${user.username}(${user.ranking})</li>`);
            $userList.append(`
              <li class="collection-item avatar">
                <img src="https://api.adorable.io/avatars/face/eyes7/nose4/mouth9/ff6600" alt="" class="circle">
                <span class="title">@${user.username}</span>
                <p class="teal-text">Ranking: ${user.ranking}</p>
              </li>
            `);
          } else {
            // $userList.append(`<li>${user.username}(${user.ranking})
            //   <button class="btn btn-warning btn-xs challengeUserBtn"
            //     onclick="challengeUser(${user.userId})">Challenge</button>
            // </li>`);
            $userList.append(`
              <li class="collection-item avatar">
                <img src="https://api.adorable.io/avatars/face/eyes7/nose4/mouth9/ff6600" alt="" class="circle">
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
    // console.log(data);
    $('#profile-picture').attr('src', 'https://api.adorable.io/avatars/face/eyes7/nose4/mouth9/ff6600');//data.session.picture_url);
    $('#profile-username').text(`@${data.session.username}`);
    $('#profile-description').text('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis non enim vel libero ultrices hendrerit at sed risus. In ac enim dolor. Curabitur id justo sed urna elementum mollis vitae ut felis.');
    // $('#login-form').hide();
    // $('#loggedIn').show();
    // $('#users-list').show();
    session = data.session;
  });

  socket.on('auth failure', (data) => {
    // console.log(data);
  });

  socket.on('logout success', (data) => {
    $('#login-element').show();
    // $('#logout-element').hide();
    $('#lobby-element').hide();
    $('#game-element').hide();
    $('#end-game-element').hide();

    // $('#loggedIn').hide();
    // $('#login-form').show();
    // // $('#users-list').hide();
    // $('#content').hide();
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

const updateEndGameElement = (data) => {
  $('#end-game-element').show();
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


};

const gameStop = (data) => {
  $('#game-element').hide();
  updateEndGameElement(data);

  let winner = data.winner;
  let loser = data.loser;
  session.inGame = false;
  $('.challengeUserBtn').show();
  $('#game').hide();
  $('#content').hide();
  $('#endGameMessage').show();
  if (winner.userId === session.userId) {
    if (data.reason == 'forfeit') {
      showAlert('FORFEITED', `<strong>@${winner.username}</strong> has won because your opponent <strong>@${loser.username}</strong> has forfeited the game.`, 5000);
      // $('#endGameMessage').text(`${winner.username} has won because your opponent ${loser.username} has forfeited the game.`);
    } else {
      // $('#endGameMessage').text(`.. game has stopped ..`);
    }
  }
  if (loser.userId === session.userId) {
    if (data.reason == 'forfeit') {
      showAlert('FORFEITED', `<strong>@${winner.username}</strong> has won because you forfeited the game.`, 5000);
      // $('#endGameMessage').text(`${winner.username} has won because you forfeited the game.`);
    } else {
      // $('#endGameMessage').text(`.. game has stopped ..`);
    }
  }
};

const gameStart = (data) => {
  gameState = data.gameState;
  $('#game-element').show();
  $('#end-game-element').hide();
  $('input#i-know-the-word').data('length', data.gameState.letters.length);
  $('input#i-know-the-word').characterCounter();

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
        letter: $target.text()//$target.val()
      });
      myTurn = false;
    }
  });
};

const renderButtons = (alphabet) => {
  // $alphabetButtons = $('#alphabet-buttons');
  // $alphabetButtons.html('');
  let keyboard = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];
  $buttons = $('#alphabet-buttons');
  $buttons.html('');
  for (let i = 0; i < keyboard.length; i++) {
    for (let j = 0; j < keyboard[i].length; j++) {
      $buttons.append(`<button class="btn alphabet-button" value="${keyboard[i][j]}">${keyboard[i][j]}</button>`);
    }
    $buttons.append('<br />')
  }

  // for (let i = 0; i < alphabet.length; i++) {
  //   let btnStr = `<button class="btn btn-primary btn-xs alphabet-button" value="${alphabet[i]}">${alphabet[i]}</button>`;
  //   let btnAppendStr = `${btnStr}`;
  //
  //   if (i % 5 == 0) {
  //     // console.log(alphabet[i]);
  //     indeces.push(alphabet[i]);
  //     // if (i == 0) {
  //     //   btnAppendStr = `<div>${btnStr}`
  //     // } else {
  //     //   btnAppendStr = `</div>${btnStr}`;
  //     //   if (i < (alphabet.length - 1)) {
  //     //     btnAppendStr += `<div>`;
  //     //   }
  //     // }
  //     // btnAppendStr = `</div>${btnStr}<div>`;
  //   }
  //   $alphabetButtons.append(btnAppendStr);
  // }
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
  console.log('guessing the word');
  if (myTurn) {
    let theWord = $('#i-know-the-word').val();
    // console.log(`Lets see if it is '${theWord}'.`);
    socket.emit('i know the word', {
      word: theWord
    });
  }
}
