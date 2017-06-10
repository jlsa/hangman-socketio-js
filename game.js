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
    this.outputString = this.createOutputString();
  }

  addLetter(letter) {
    letter = letter.toUpperCase();
    this.playedLetters.push(letter);
    let indexOfLetter = this.notUsedLetters.indexOf(letter);
    this.notUsedLetters.splice(indexOfLetter, 1);

    if (this.validateLetter(letter, this.letters)) {
      this.correctLetters.push(letter);
    } else {
      this.incorrectLetters.push(letter);
    }
    this.outputString = this.createOutputString();
  }

  addWord(word) {
    this.word = word;
    this.letters = word.split("");
    this.outputString = this.createOutputString();
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
    this.playerOne = this.players[0];
    this.playerTwo = this.players[1];
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
      outputString: this.outputString
    };
    return state;
  }

  validateLetter(letter, letters = this.letters) {
    for (let i = 0; i < letters.length; i++) {
      if (letters[i] === letter) {
        return true;
      }
    }
    return false;
  }
}

module.exports = Game;
