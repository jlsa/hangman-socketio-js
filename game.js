const Utils = require('./utils.js');
class Game {
  constructor() {
    this.letters = [];
    this.players = [];
    this.playedLetters = [];
    this.correctLetters = [];
    this.incorrectLetters = [];
    this.notUsedLetters = [
      'A', 'B', 'C', 'D', 'E',
      'F', 'G', 'H', 'I', 'J',
      'K', 'L', 'M', 'N', 'O',
      'P', 'Q', 'R', 'S', 'T',
      'U', 'V', 'W', 'X', 'Y',
      'Z'
    ];
    this.uniqueLetters = [];
    this.outputString = this.createOutputString();
    this.ended = false;
    this.currentPlayer = null;
    this.guessAttempts = 0;
    this.endState = '';
    this.wordIsGuessed = false;
    this.forfeited = false;
    this.forfeitedPlayer = null;
  }

  addLetter(letter) {
    letter = letter.toUpperCase();
    this.playedLetters.push(letter);
    let indexOfLetter = this.notUsedLetters.indexOf(letter);
    this.notUsedLetters.splice(indexOfLetter, 1);

    if (this.validateLetter(letter, this.uniqueLetters)) {
      this.correctLetters.push(letter);
      this.correctLetters.sort();
    } else {
      this.incorrectLetters.push(letter);
      this.incorrectLetters.sort();
      this.guessAttempts += 1;
    }
    this.outputString = this.createOutputString();

    // lets see if the player has won or not
    this.checkEndConditions();
  }

  checkEndConditions() {
    if (this.wordIsGuessed) {
      this.ended = true;
      this.endState = 'won';
    }

    if (Utils.arraysEqual(this.correctLetters, this.uniqueLetters)) {
      this.ended = true;
      this.endState = 'won';
    }

    if (this.guessAttempts == 11) {
      this.ended = true;
      this.endState = 'lost-both';
    }

    if (this.forfeited) {
      this.ended = true;
      this.endState = 'forfeited';
    }
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  nextTurn() {
    if (this.currentPlayer.userId === this.playerTwo.userId) {
      this.currentPlayer = this.playerOne;
    } else {
      this.currentPlayer = this.playerTwo;
    }
  }

  guessWord(word) {
    if (this.word === word) {
      this.wordIsGuessed = true;
    } else {
      this.guessAttempts += 1;
    }
    console.log(this.guessAttempts);
    // lets see if the player has won or not
    this.checkEndConditions();
  }

  isEnded() {
    return this.ended;
  }

  getEndState() {
    return this.endState;
  }

  addWord(word) {
    this.word = word;
    this.letters = word.split("");
    this.outputString = this.createOutputString();
    this.uniqueLetters = this.letters.unique().sort();
  }

  addPlayer(player) {
    this.players.push(player);
  }

  getPlayers() {
    return this.players;
  }

  getPlayer(socketId) {
    let player = null;
    for (let i = 0; i < this.players.length; i++) {
      let temp = this.players[i];
      if (temp.socketId === socketId) {
        player = temp;
        break;
      }
    }
    return player;
  }

  getPlayerOne() {
    return this.playerOne;
  }

  getPlayerTwo() {
    return this.playerTwo;
  }

  start() {
    let index = Math.floor(Math.random() * this.players.length) + 1;
    // console.log(`selecting player ${index} as player one`);
    if (index == 1) {
      this.playerOne = this.players[0];
      this.playerTwo = this.players[1];
    } else {
      this.playerOne = this.players[1];
      this.playerTwo = this.players[0];
    }

    this.currentPlayer = this.playerOne;
  }

  hasPlayer(socketId) {
    if (this.playerOne.socketId === socketId) {
      return true;
    }

    if (this.playerTwo.socketId === socketId) {
      return true;
    }

    return false;
  }

  getOpponent(player) {
    if (player.socketId === this.playerOne.socketId) {
      return this.playerTwo;
    } else {
      return this.playerOne;
    }
  }

  createOutputString() {
    let temp = [];
    for (let i = 0; i < this.letters.length; i++) {
      let letter = this.letters[i];
      if (this.validateLetter(letter, this.correctLetters)) {
        temp[i] = letter;
      } else {
        temp[i] = '_';
      }
    }
    return temp.join(' ');
  }

  getState() {
    let state = {
      playerOne: this.getPlayerOne(),
      playerTwo: this.getPlayerTwo(),
      word: this.word,
      letters: this.letters,
      lettersCorrect: this.correctLetters,
      lettersIncorrect: this.incorrectLetters,
      playedLetters: this.playedLetters,
      notUsedLetters: this.notUsedLetters,
      outputString: this.outputString,
      uniqueLetters: this.uniqueLetters,
      guessAttempts: this.guessAttempts
    };
    return state;
  }

  validateLetter(letter, letters = this.uniqueLetters) {
    for (let i = 0; i < letters.length; i++) {
      if (letters[i] === letter) {
        return true;
      }
    }
    return false;
  }

  forfeit(player) {
    this.forfeited = true;
    this.checkEndConditions();
  }
}

module.exports = Game;
