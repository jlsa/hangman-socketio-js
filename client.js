const socket = io({transports: ['websocket'], upgrade: false});//.connect('http://localhost:8080');
let session;
let loggedInUsers;

let playerOne;
let playerTwo;
let myTurn = false;
let gameState;

socket.on('logging', (data) => {
  $('#updates').append('<li>' + data.message + '</li>');
  let log = document.getElementById('footer');
  log.scrollTop = log.scrollHeight;
});

const init = () => {
  $('#loggedIn').hide();
  $('#content').hide();
  $('#game').hide();
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
    // console.log(values);
  });

  socket.on('user list update', (data) => {
    console.log(data);
    loggedInUsers = data.users;
    $userList = $('#users-list');
    $userList.html('');
    for (let i = 0; i < data.users.length; i++) {
      let user = data.users[i];
      if (session.userId !== user.userId) {
        $userList.append(`<li>${user.username} - Ranking(${user.ranking})
          <button class="btn btn-warning btn-xs challengeUserBtn" onclick="challengeUser(${user.userId})">Challenge</button></li>`);
      } else {
        $userList.append(`<li>${user.username} - Ranking(${user.ranking})</li>`);
      }
    }
  });

  socket.on('auth success', (data) => {
    // console.log(data);
    $('#login-form').hide();
    $('#loggedIn').show();
    $('#users-list').show();
    $('#content').show();
    session = data.session;
    // console.log(session);
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
    if (myTurn) {
      $('#turnIndicator').text('Your turn!');
    } else {
      $('#turnIndicator').text('Your opponent\'s turn.');
    }
  });

  socket.on('turn', (data) => {
    console.log(data);
    myTurn = data.myTurn;
    if (myTurn) {
      $('#turnIndicator').text('Your turn!');
    } else {
      $('#turnIndicator').text('Your opponent\'s turn.');
    }
  });

  socket.on('update gamestate', (data) => {
    console.log('update gamestate', data);
    let letters = data.letters;
    let lettersCorrect = data.lettersCorrect;
    let notUsedLetters = data.notUsedLetters;
    let playedLetters = data.playedLetters;
    let word = data.word;
    console.log('not used letters: ', notUsedLetters);

    renderButtons(notUsedLetters);
    $('.alphabet-button').click((e) => {
      console.log('clicked on a letter');
      if (myTurn) {
        let $target = $(e.target);
        console.log($target.val());
        $target.prop('disabled', true);
        socket.emit('check letter', {
          player: session,
          letter: $target.val()
        });
        myTurn = false;
      }
    });
  });
});


const gameStart = (data) => {
  // $('#alphabet-buttons').
  console.log('game started', data);
  gameState = data.gameState;
  $('.challengeUserBtn').hide();
  $('#game').show();
  $('.showPlayerName').text(session.username);

  $userList = $('#playersInGame');
  $userList.html('');
  $userList.append(`<li>Player One: ${data.gameState.playerOne.username}</li>`);
  $userList.append(`<li>Player Two: ${data.gameState.playerTwo.username}</li>`);


  renderButtons(data.gameState.notUsedLetters);

  playerOne = data.gameState.playerOne;
  playerTwo = data.gameState.playerTwo;

  console.log('-----')
  console.log(session);
  console.log('-----');
  if (playerOne.username === session.username) {
    myTurn = true;
  }


  $('.alphabet-button').click((e) => {
    console.log('clicked on a letter');
    if (myTurn) {
      let $target = $(e.target);
      console.log($target.val());
      $target.prop('disabled', true);
      socket.emit('check letter', {
        player: session,
        letter: $target.val()
      });
      myTurn = false;
    }
  });



  // socket.on('update gamestate', (data) => {
  //   console.log(data);
  //   let letters = data.letters;
  //   let lettersCorrect = data.lettersCorrect;
  //   let notUsedLetters = data.notUsedLetters;
  //   let playedLetters = data.playedLetters;
  //   let word = data.word;
  // });
  //
  // socket.on('turn', (data) => {
  //   myTurn = data.myTurn;
  // });
};

const renderButtons = (alphabet) => {
  $alphabetButtons = $('#alphabet-buttons');
  $alphabetButtons.html('');
  for (let i = 0; i < alphabet.length; i++) {
    $alphabetButtons.append(`<button class="btn btn-primary btn-xs alphabet-button" value="${alphabet[i]}">${alphabet[i]}</button>`);
  }
}

const challengeUser = (id) => {
  console.log(session);
  console.log(`you: ${session.userId} are challenging user ${id}`);
  socket.emit('challenge user', {
    challenger: session.userId,
    challenged: id
  });
}
