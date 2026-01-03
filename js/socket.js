// Socket.IO Client Wrapper
class SocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.gameId = null;
    this.playerRole = null;
  }

  connect() {
    this.socket = io();
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.connected = false;
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Matchmaking events
    this.socket.on('waiting-for-match', () => {
      console.log('Waiting for opponent...');
    });

    this.socket.on('match-found', (data) => {
      this.gameId = data.gameId;
      this.playerRole = data.playerRole;
      window.gameUI.onMatchFound(data);
    });

    // Toss events
    this.socket.on('start-toss', () => {
      window.gameUI.showTossModal();
    });

    this.socket.on('toss-auto-assigned', (choice) => {
      window.gameUI.onTossAutoAssigned(choice);
    });

    this.socket.on('toss-started', (data) => {
      window.gameUI.onTossStarted(data);
    });

    this.socket.on('toss-result', (data) => {
      window.gameUI.onTossResult(data);
    });

    // Game start
    this.socket.on('game-start', (data) => {
      window.gameState.initializeGame(data);
      window.gameUI.onGameStart(data);
    });

    // Phase changes
    this.socket.on('phase-change', (data) => {
      window.gameState.currentPhase = data.phase;
      window.gameUI.announcePhase(data.phase, data.message);
      
      // Show Devta selection UI when entering devik-vardan phase
      if (data.phase === 'devik-vardan') {
        const devtaSelection = document.getElementById('devta-selection');
        if (devtaSelection) {
          devtaSelection.classList.remove('hidden');
        }
      }
    });

    // Pasa events
    this.socket.on('pasa-rolled', (data) => {
      window.gameUI.onPasaRolled(data);
    });

    this.socket.on('pasa-selected', (data) => {
      window.gameUI.onPasaSelected(data);
    });

    this.socket.on('pasa-deselected', (data) => {
      window.gameUI.onPasaDeselected(data);
    });

    this.socket.on('turn-change', (data) => {
      window.gameState.currentTurn = data.currentTurn;
      window.gameUI.onTurnChange(data);
    });

    // Combat events - Sequential actions
    this.socket.on('combat-action', (data) => {
      window.gameUI.onCombatAction(data);
    });

    this.socket.on('new-round', (data) => {
      window.gameState.resetForNewRound(data);
      window.gameUI.onNewRound(data);
    });

    // Game over
    this.socket.on('game-over', (data) => {
      window.gameUI.onGameOver(data);
    });

    this.socket.on('opponent-disconnected', () => {
      window.gameUI.onOpponentDisconnected();
    });
  }

  // Emit events
  sendPlayerReady(playerData) {
    this.socket.emit('player-ready', playerData);
  }

  findMatch() {
    this.socket.emit('find-match');
  }

  sendTossChoice(choice) {
    this.socket.emit('toss-choice', choice);
  }

  sendReadyToPlay() {
    this.socket.emit('ready-to-play');
  }

  rollPasa() {
    this.socket.emit('roll-pasa');
  }

  selectPasa(pasaData) {
    this.socket.emit('select-pasa', pasaData);
  }

  deselectPasa(pasaId) {
    this.socket.emit('deselect-pasa', pasaId);
  }

  completeTurn() {
    this.socket.emit('complete-turn');
  }

  sendDevtaSelection(useDevta) {
    this.socket.emit('devta-selection', useDevta);
  }
}

// Create global socket manager
window.socketManager = new SocketManager();
