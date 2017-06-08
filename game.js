
class Game {

  constructor() {
    this.players = [];
  }

  addPlayer(player) {
    console.log('adding player', player);
    this.players.push(player);
  }

  getPlayers() {
    return this.players;
  }

  getPlayerOne() {
    return null;
  }

  getPlayerTwo() {
    return null;
  }
}

module.exports = Game;
