// Game State Manager
class GameState {
  constructor() {
    this.player = {
      id: null,
      username: '',
      avatar: '',
      health: 20,
      tokens: 2,
      devtaCard: null,
      selectedPasa: [],
      currentRoll: [],
      rollCount: 0
    };

    this.opponent = {
      id: null,
      username: '',
      avatar: '',
      health: 20,
      tokens: 2,
      devtaCard: null,
      selectedPasa: [],
      rollCount: 0
    };

    this.currentPhase = 'waiting';
    this.currentTurn = null;
    this.isMyTurn = false;
    this.gameId = null;
  }

  initializeGame(data) {
    this.gameId = data.gameId;
    this.currentPhase = data.phase;
    this.currentTurn = data.currentTurn;
    this.isMyTurn = this.currentTurn === this.player.id;

    // Determine which player we are based on socket ID
    const isPlayer1 = this.player.id === data.gameState.player1.id || 
                      (data.gameState.player1.id && this.player.id === data.gameState.player1.id);
    
    // Check by comparing with the data structure - if player1 data exists, use it
    // We need to figure out which player we are
    const player1Data = data.gameState.player1;
    const player2Data = data.gameState.player2;
    
    // The socket manager sets player.id before this is called
    // So we can check if our ID matches player1 or player2
    let myData, opponentData;
    
    // Since we don't have player IDs in gameState data, we need to use playerRole from socket
    // Let's check if we're player1 or player2 based on the socket manager's playerRole
    if (window.socketManager && window.socketManager.playerRole === 'player1') {
      myData = player1Data;
      opponentData = player2Data;
    } else {
      myData = player2Data;
      opponentData = player1Data;
    }

    // Set player stats
    this.player.health = myData.health;
    this.player.tokens = myData.tokens;
    this.player.devtaCard = myData.devtaCard;

    // Set opponent stats
    this.opponent.health = opponentData.health;
    this.opponent.tokens = opponentData.tokens;
    this.opponent.devtaCard = opponentData.devtaCard;
  }

  updatePlayerHealth(playerId, newHealth) {
    if (playerId === this.player.id) {
      this.player.health = newHealth;
    } else {
      this.opponent.health = newHealth;
    }
  }

  updatePlayerTokens(playerId, newTokens) {
    if (playerId === this.player.id) {
      this.player.tokens = newTokens;
    } else {
      this.opponent.tokens = newTokens;
    }
  }

  addSelectedPasa(pasaData) {
    this.player.selectedPasa.push(pasaData);
  }

  removeSelectedPasa(pasaId) {
    this.player.selectedPasa = this.player.selectedPasa.filter(p => p.pasaId !== pasaId);
  }

  setCurrentRoll(rolledPasa) {
    this.player.currentRoll = rolledPasa;
  }

  incrementRollCount() {
    this.player.rollCount++;
  }

  canRollAgain() {
    return this.player.rollCount < GAME_CONSTANTS.MAX_ROLLS && 
           this.player.selectedPasa.length < GAME_CONSTANTS.PASA_COUNT;
  }

  isPhaseComplete() {
    return this.player.selectedPasa.length === GAME_CONSTANTS.PASA_COUNT || 
           this.player.rollCount === GAME_CONSTANTS.MAX_ROLLS;
  }

  resetForNewRound(data) {
    this.player.selectedPasa = [];
    this.player.currentRoll = [];
    this.player.rollCount = 0;

    this.opponent.selectedPasa = [];
    this.opponent.rollCount = 0;

    // Assign Devta cards based on player role
    if (window.socketManager && window.socketManager.playerRole === 'player1') {
      this.player.devtaCard = data.player1Devta;
      this.opponent.devtaCard = data.player2Devta;
    } else {
      this.player.devtaCard = data.player2Devta;
      this.opponent.devtaCard = data.player1Devta;
    }

    this.currentPhase = data.phase;
    this.currentTurn = data.currentTurn;
    this.isMyTurn = this.currentTurn === this.player.id;
  }

  getProfile() {
    const profile = localStorage.getItem('playerProfile');
    return profile ? JSON.parse(profile) : null;
  }

  saveProfile(username, avatar) {
    const profile = { username, avatar };
    localStorage.setItem('playerProfile', JSON.stringify(profile));
    this.player.username = username;
    this.player.avatar = avatar;
    return profile;
  }
}

// Don't instantiate here - will be done in main.js after all scripts load

