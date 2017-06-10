class Game {
  constructor() {
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
  }

  addLetter(letter) {
    letter = letter.toUpperCase();
    this.playedLetters.push(letter);
    let indexOfLetter = this.notUsedLetters.indexOf(letter);
    this.notUsedLetters.splice(indexOfLetter, 1);
    // should give back the indexes of the correct letter in the word
    for (let i = 0; i < this.letters.length; i++) {
      if (letter === this.letters[i]) {
        this.correctLetters.push(letter);
        return true;
      } else {
        this.incorrectLetters.push(letter);
        return false;
      }
    }
  }

  addWord(word) {
    this.word = word;
    this.letters = word.split("");
  }

  addPlayer(player) {
    console.log('adding player', player);
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

  getState() {
    return {
      playerOne: this.getPlayerOne(),
      playerTwo: this.getPlayerTwo(),
      word: this.word,
      letters: this.letters,
      lettersCorrect: this.correctLetters,
      lettersIncorrect: this.incorrectLetters,
      playedLetters: this.playedLetters,
      notUsedLetters: this.notUsedLetters,
    };
  }
}

module.exports = Game;
