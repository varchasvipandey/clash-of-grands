// Main application entry point
document.addEventListener('DOMContentLoaded', () => {
  console.log('Norse Board Game - Initializing...');
  
  // Check screen size
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
  
  // Initialize game state and UI (must be done before socket connection)
  window.gameState = new GameState();
  window.gameUI = new GameUI();
  
  // Connect to server
  window.socketManager.connect();
  
  console.log('Game ready!');
});

function checkScreenSize() {
  const screenWarning = document.getElementById('screen-warning');
  const minWidth = GAME_CONSTANTS.MIN_SCREEN_WIDTH;
  const minHeight = GAME_CONSTANTS.MIN_SCREEN_HEIGHT;
  
  if (window.innerWidth < minWidth || window.innerHeight < minHeight) {
    screenWarning.style.display = 'flex';
  } else {
    screenWarning.style.display = 'none';
  }
}
