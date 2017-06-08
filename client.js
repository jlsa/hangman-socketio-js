const socket = io({transports: ['websocket'], upgrade: false});//.connect('http://localhost:8080');
let session;
let loggedInUsers;

socket.on('logging', (data) => {
  $('#updates').append('<li>' + data.message + '</li>');
  let log = document.getElementById('footer');
  log.scrollTop = log.scrollHeight;
});

$(document).ready(() => {
  $('#loggedIn').hide();
  $('#content').hide();
  $('form').submit((event) => {
    event.preventDefault();
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
    console.log(values);
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
          <button class="btn btn-warning" onclick="challengeUser(${user.userId})">Challenge</button></li>`);
      } else {
        $userList.append(`<li>${user.username} - Ranking(${user.ranking})</li>`);
      }

    }
  });

  socket.on('auth success', (data) => {
    console.log(data);
    $('#login-form').hide();
    $('#loggedIn').show();
    $('#users-list').show();
    $('#content').show();
    session = data.session;
    console.log(session);
  });

  socket.on('auth failure', (data) => {
    console.log(data);
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
    console.log(data);
  });
});


const challengeUser = (id) => {
  console.log(session);
  console.log(`you: ${session.userId} are challenging user ${id}`);
  socket.emit('challenge user', {
    challenger: session.userId,
    challenged: id
  });
}
