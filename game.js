const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const CELL_SIZE = 25;
const BASE_GRID_SIZE = 20;
const PLAYER_SIZE = 16;

// Game state
let currentLevel = 1;
let maxLevel = 20;
let player = { x: 1, y: 1 };
let exit;
let maze = [];
let timeStarted;
let bestTimes = {};
let isGeneratingMaze = false;
let isAnimatingWin = false;
let gameStarted = false;
let gameDifficulty = null; // 'easy' or 'hard'

// Show welcome screen
function showWelcomeScreen() {
    const GRID_SIZE = BASE_GRID_SIZE;
    canvas.width = GRID_SIZE * CELL_SIZE;
    canvas.height = GRID_SIZE * CELL_SIZE;
    
    // Clear canvas with white background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw welcome text
    ctx.fillStyle = '#333';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    const welcomeText = 'Welcome to Maze!';
    ctx.fillText(welcomeText, canvas.width/2, canvas.height/2 - 50);
    
    // Create difficulty buttons if they don't exist
    if (!document.getElementById('difficultyButtons')) {
        const buttonsDiv = document.createElement('div');
        buttonsDiv.id = 'difficultyButtons';
        buttonsDiv.style.textAlign = 'center';
        buttonsDiv.style.marginTop = '20px';
        buttonsDiv.style.display = 'flex';
        buttonsDiv.style.gap = '20px';
        buttonsDiv.style.justifyContent = 'center';
        
        const easyButton = document.createElement('button');
        easyButton.textContent = 'Easy';
        easyButton.style.padding = '12px 24px';
        easyButton.style.fontSize = '18px';
        easyButton.style.cursor = 'pointer';
        easyButton.style.backgroundColor = '#4CAF50';
        easyButton.style.color = 'white';
        easyButton.style.border = 'none';
        easyButton.style.borderRadius = '5px';
        
        const hardButton = document.createElement('button');
        hardButton.textContent = 'Hard';
        hardButton.style.padding = '12px 24px';
        hardButton.style.fontSize = '18px';
        hardButton.style.cursor = 'pointer';
        hardButton.style.backgroundColor = '#f44336';
        hardButton.style.color = 'white';
        hardButton.style.border = 'none';
        hardButton.style.borderRadius = '5px';
        
        easyButton.onclick = () => startGame('easy');
        hardButton.onclick = () => startGame('hard');
        
        buttonsDiv.appendChild(easyButton);
        buttonsDiv.appendChild(hardButton);
        canvas.parentElement.insertBefore(buttonsDiv, canvas.nextSibling);
        
        // Hide game controls initially
        const controlsDiv = document.getElementById('gameControls');
        if (controlsDiv) {
            controlsDiv.style.display = 'none';
        }
    }
}

function startGame(difficulty) {
    gameStarted = true;
    gameDifficulty = difficulty;
    
    // Hide difficulty buttons
    const buttonsDiv = document.getElementById('difficultyButtons');
    if (buttonsDiv) {
        buttonsDiv.style.display = 'none';
    }
    
    // Add game controls if they don't exist
    if (!document.getElementById('gameControls')) {
        addControls();
    }
    
    // Show game controls
    const controlsDiv = document.getElementById('gameControls');
    if (controlsDiv) {
        controlsDiv.style.display = 'flex';
    }
    
    // Start the game
    currentLevel = 1;
    generateMaze();
    drawMaze();
}

// Get current grid size based on level and difficulty
function getCurrentGridSize() {
    if (gameDifficulty === 'easy') {
        // Increased base size and growth rate for easy mode
        const baseSize = 18;
        return baseSize + Math.floor(currentLevel * 0.5);
    } else {
        // Hard mode remains the same
        const baseSize = 20;
        const maxSize = 35;
        const growthFactor = Math.min(currentLevel * 0.7, 15);
        return Math.min(baseSize + Math.floor(growthFactor), maxSize);
    }
}

// Generate a maze using recursive backtracking with difficulty-based complexity
function generateMaze() {
    if (isGeneratingMaze) return;
    isGeneratingMaze = true;
    
    try {
        const GRID_SIZE = getCurrentGridSize();
        player = { x: 1, y: 1 };
        
        // Randomize exit position in easy mode for higher levels
        if (gameDifficulty === 'easy' && currentLevel > 8) {
            const side = Math.floor(Math.random() * 2); // Only use two sides in easy mode
            switch(side) {
                case 0: exit = { x: GRID_SIZE - 2, y: GRID_SIZE - 2 }; break;
                case 1: exit = { x: Math.floor(GRID_SIZE/2), y: GRID_SIZE - 2 }; break;
            }
        } else {
            exit = { x: GRID_SIZE - 2, y: GRID_SIZE - 2 };
        }
        
        createSinglePath();
        
        // Add some walls in easy mode (but fewer than hard mode)
        if (gameDifficulty === 'easy' && currentLevel > 5) {
            const numWalls = Math.min(
                Math.floor(currentLevel * 1.5),
                Math.floor(GRID_SIZE * GRID_SIZE * 0.1)
            );
            
            for (let i = 0; i < numWalls; i++) {
                const x = 2 + Math.floor(Math.random() * (GRID_SIZE - 4));
                const y = 2 + Math.floor(Math.random() * (GRID_SIZE - 4));
                
                if (maze[y][x] === 0 && !wouldBlockAccess(x, y, GRID_SIZE)) {
                    maze[y][x] = 1;
                }
            }
        }
        
        timeStarted = Date.now();
    } finally {
        isGeneratingMaze = false;
    }
}

function createSinglePath() {
    const GRID_SIZE = getCurrentGridSize();
    maze = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(1));
    const visited = new Set();
    const stack = [{x: 1, y: 1}];
    maze[1][1] = 0;
    
    // Create initial paths using recursive backtracking
    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const {x, y} = current;
        const key = `${x},${y}`;
        visited.add(key);
        
        // Get possible directions
        const directions = [];
        
        // Add all possible directions (2 blocks apart)
        if (x < GRID_SIZE - 2) directions.push({dx: 2, dy: 0});
        if (y < GRID_SIZE - 2) directions.push({dx: 0, dy: 2});
        if (x > 2) directions.push({dx: -2, dy: 0});
        if (y > 2) directions.push({dx: 0, dy: -2});
        
        // Filter valid moves
        const validMoves = directions.filter(({dx, dy}) => {
            const newX = x + dx;
            const newY = y + dy;
            return newX > 0 && newX < GRID_SIZE - 1 &&
                   newY > 0 && newY < GRID_SIZE - 1 &&
                   !visited.has(`${newX},${newY}`);
        });
        
        if (validMoves.length > 0) {
            // Choose random direction
            const move = validMoves[Math.floor(Math.random() * validMoves.length)];
            const {dx, dy} = move;
            
            // Create path
            maze[y + dy/2][x + dx/2] = 0;
            maze[y + dy][x + dx] = 0;
            
            stack.push({x: x + dx, y: y + dy});
        } else {
            stack.pop();
        }
    }
    
    // Ensure path to exit exists
    const pathToExit = findPathToExit(GRID_SIZE);
    pathToExit.forEach(({x, y}) => {
        maze[y][x] = 0;
    });
    
    // Add branching paths based on difficulty
    addBranchingPaths(GRID_SIZE);
    
    // For hard mode, add complexity without blocking paths
    if (gameDifficulty === 'hard') {
        addHardModeComplexity(GRID_SIZE);
    }
}

function addBranchingPaths(GRID_SIZE) {
    const numBranches = gameDifficulty === 'hard' ? 
        Math.floor(currentLevel * 2) : 
        Math.floor(currentLevel * 1.8); // Increased branching for easy mode
    
    for (let i = 0; i < numBranches; i++) {
        let startX, startY;
        let attempts = 0;
        const maxAttempts = 50;
        
        do {
            startX = 2 + Math.floor(Math.random() * (GRID_SIZE - 4));
            startY = 2 + Math.floor(Math.random() * (GRID_SIZE - 4));
            attempts++;
        } while (maze[startY][startX] !== 0 && attempts < maxAttempts);
        
        if (attempts >= maxAttempts) continue;
        
        const directions = [
            {dx: 2, dy: 0}, {dx: -2, dy: 0},
            {dx: 0, dy: 2}, {dx: 0, dy: -2}
        ];
        
        // Add more branching paths in easy mode
        for (const {dx, dy} of directions) {
            const newX = startX + dx;
            const newY = startY + dy;
            
            if (newX > 1 && newX < GRID_SIZE - 2 &&
                newY > 1 && newY < GRID_SIZE - 2 &&
                maze[newY][newX] === 1) {
                maze[startY + dy/2][startX + dx/2] = 0;
                maze[newY][newX] = 0;
                
                // Add extra branches in easy mode (but less than hard mode)
                if (gameDifficulty === 'easy' && Math.random() < 0.3) {
                    const extraX = newX + dx;
                    const extraY = newY + dy;
                    if (extraX > 1 && extraX < GRID_SIZE - 2 &&
                        extraY > 1 && extraY < GRID_SIZE - 2 &&
                        maze[extraY][extraX] === 1) {
                        maze[newY + dy/2][newX + dx/2] = 0;
                        maze[extraY][extraX] = 0;
                    }
                }
            }
        }
    }
}

function addHardModeComplexity(GRID_SIZE) {
    const numWalls = Math.min(
        Math.floor(currentLevel * 3), 
        Math.floor(GRID_SIZE * GRID_SIZE * 0.2)
    );
    
    for (let i = 0; i < numWalls; i++) {
        const x = 2 + Math.floor(Math.random() * (GRID_SIZE - 4));
        const y = 2 + Math.floor(Math.random() * (GRID_SIZE - 4));
        
        if (maze[y][x] === 0 && !wouldBlockAccess(x, y, GRID_SIZE)) {
            maze[y][x] = 1;
        }
    }
}

function wouldBlockAccess(wallX, wallY, GRID_SIZE) {
    // Temporarily add wall
    const originalValue = maze[wallY][wallX];
    maze[wallY][wallX] = 1;
    
    // Check if path exists from start to exit
    const visited = new Set();
    const stack = [{x: 1, y: 1}];
    let foundExit = false;
    
    while (stack.length > 0 && !foundExit) {
        const current = stack.pop();
        const key = `${current.x},${current.y}`;
        
        if (current.x === exit.x && current.y === exit.y) {
            foundExit = true;
            break;
        }
        
        if (!visited.has(key)) {
            visited.add(key);
            
            const directions = [
                {dx: 1, dy: 0}, {dx: -1, dy: 0},
                {dx: 0, dy: 1}, {dx: 0, dy: -1}
            ];
            
            for (const {dx, dy} of directions) {
                const newX = current.x + dx;
                const newY = current.y + dy;
                
                if (newX >= 0 && newX < GRID_SIZE &&
                    newY >= 0 && newY < GRID_SIZE &&
                    maze[newY][newX] === 0) {
                    stack.push({x: newX, y: newY});
                }
            }
        }
    }
    
    // Restore original value
    maze[wallY][wallX] = originalValue;
    
    return !foundExit;
}

function findPathToExit(GRID_SIZE) {
    // Find path from current position to exit
    const path = [];
    let current = {x: player.x, y: player.y};
    
    while (current.x !== exit.x || current.y !== exit.y) {
        path.push(current);
        
        if (current.x < exit.x) current.x++;
        else if (current.x > exit.x) current.x--;
        
        if (current.y < exit.y) current.y++;
        else if (current.y > exit.y) current.y--;
    }
    path.push(exit);
    
    return path;
}

// Win animation
function playWinAnimation() {
    if (isAnimatingWin) return;
    isAnimatingWin = true;
    
    const GRID_SIZE = getCurrentGridSize();
    let frame = 0;
    const totalFrames = 30;
    
    function animate() {
        if (frame >= totalFrames) {
            isAnimatingWin = false;
            proceedToNextLevel();
            return;
        }
        
        // Draw the maze
        drawMazeBase();
        
        // Draw expanding circle at exit
        const radius = (frame / totalFrames) * CELL_SIZE * 2;
        ctx.beginPath();
        ctx.arc(
            exit.x * CELL_SIZE + CELL_SIZE/2,
            exit.y * CELL_SIZE + CELL_SIZE/2,
            radius,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = `rgba(255, 0, 0, ${1 - frame/totalFrames})`;
        ctx.fill();
        
        frame++;
        requestAnimationFrame(animate);
    }
    
    animate();
}

function drawMazeBase() {
    const GRID_SIZE = getCurrentGridSize();
    
    // Clear canvas with white background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw walls
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (maze[y][x] === 1) {
                ctx.fillStyle = '#FFD700'; // Yellow walls
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }
    
    // Draw exit
    ctx.fillStyle = '#FF0000'; // Red exit
    ctx.fillRect(exit.x * CELL_SIZE, exit.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    
    // Draw player
    ctx.fillStyle = '#FFA500'; // Orange player
    ctx.fillRect(
        player.x * CELL_SIZE + (CELL_SIZE - PLAYER_SIZE) / 2,
        player.y * CELL_SIZE + (CELL_SIZE - PLAYER_SIZE) / 2,
        PLAYER_SIZE,
        PLAYER_SIZE
    );
    
    // Draw level info
    ctx.fillStyle = '#000';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`Level ${currentLevel}`, 10, GRID_SIZE * CELL_SIZE - 10);
    
    // Draw timer
    const timeElapsed = Math.floor((Date.now() - timeStarted) / 1000);
    ctx.fillText(`Time: ${timeElapsed}s`, GRID_SIZE * CELL_SIZE - 100, GRID_SIZE * CELL_SIZE - 10);
}

function drawMaze() {
    const GRID_SIZE = getCurrentGridSize();
    canvas.width = GRID_SIZE * CELL_SIZE;
    canvas.height = GRID_SIZE * CELL_SIZE;
    drawMazeBase();
}

function proceedToNextLevel() {
    const timeElapsed = Math.floor((Date.now() - timeStarted) / 1000);
    if (!bestTimes[currentLevel] || timeElapsed < bestTimes[currentLevel]) {
        bestTimes[currentLevel] = timeElapsed;
    }
    
    if (currentLevel < maxLevel) {
        const prevLevel = currentLevel;
        currentLevel++;
        alert(`Level ${prevLevel} completed in ${timeElapsed} seconds!\nBest time: ${bestTimes[prevLevel]} seconds\nMoving to level ${currentLevel}`);
        
        player = { x: 1, y: 1 };
        generateMaze();
        drawMaze();
        
        const levelSelect = document.querySelector('select');
        if (levelSelect) {
            levelSelect.value = currentLevel;
        }
    } else {
        alert('Congratulations! You\'ve completed all levels!');
        returnToMainMenu();
    }
}

function returnToMainMenu() {
    // Reset game state
    gameStarted = false;
    gameDifficulty = null;
    currentLevel = 1;
    player = { x: 1, y: 1 };
    
    // Show welcome screen
    showWelcomeScreen();
    
    // Show difficulty buttons
    const buttonsDiv = document.getElementById('difficultyButtons');
    if (buttonsDiv) {
        buttonsDiv.style.display = 'flex';
    }
    
    // Hide game controls
    const controlsDiv = document.getElementById('gameControls');
    if (controlsDiv) {
        controlsDiv.style.display = 'none';
    }
}

// Handle keyboard input
function handleKeyPress(e) {
    if (isAnimatingWin) return;
    
    const GRID_SIZE = getCurrentGridSize();
    const newPlayer = { ...player };
    
    switch (e.key) {
        case 'ArrowUp':
            newPlayer.y--;
            break;
        case 'ArrowDown':
            newPlayer.y++;
            break;
        case 'ArrowLeft':
            newPlayer.x--;
            break;
        case 'ArrowRight':
            newPlayer.x++;
            break;
        default:
            return;
    }
    
    if (isGeneratingMaze) return;
    
    if (newPlayer.x >= 0 && newPlayer.x < GRID_SIZE &&
        newPlayer.y >= 0 && newPlayer.y < GRID_SIZE &&
        maze[newPlayer.y][newPlayer.x] === 0) {
        
        player = newPlayer;
        
        if (player.x === exit.x && player.y === exit.y) {
            playWinAnimation();
        }
        
        drawMaze();
    }
}

// Add UI controls
function addControls() {
    const controlsDiv = document.createElement('div');
    controlsDiv.id = 'gameControls';
    controlsDiv.style.marginTop = '10px';
    controlsDiv.style.display = 'flex';
    controlsDiv.style.gap = '10px';
    controlsDiv.style.justifyContent = 'center';
    
    // Back to Main button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Main';
    backButton.style.padding = '8px 16px';
    backButton.style.fontSize = '16px';
    backButton.style.backgroundColor = '#607D8B';
    backButton.style.color = 'white';
    backButton.style.border = 'none';
    backButton.style.borderRadius = '5px';
    backButton.style.cursor = 'pointer';
    backButton.onclick = () => {
        if (isGeneratingMaze) return;
        if (confirm('Are you sure you want to return to the main menu? Your progress will not be saved.')) {
            returnToMainMenu();
        }
    };
    
    // New Game button
    const newGameButton = document.createElement('button');
    newGameButton.textContent = 'New Game';
    newGameButton.style.padding = '8px 16px';
    newGameButton.style.fontSize = '16px';
    newGameButton.style.backgroundColor = '#2196F3';
    newGameButton.style.color = 'white';
    newGameButton.style.border = 'none';
    newGameButton.style.borderRadius = '5px';
    newGameButton.style.cursor = 'pointer';
    newGameButton.onclick = () => {
        if (isGeneratingMaze) return;
        if (confirm('Are you sure you want to start a new game? Your progress will not be saved.')) {
            currentLevel = 1;
            player = { x: 1, y: 1 };
            generateMaze();
            drawMaze();
            
            // Update level selector
            const levelSelect = document.querySelector('select');
            if (levelSelect) {
                levelSelect.value = currentLevel;
            }
        }
    };
    
    // Level selector
    const levelSelect = document.createElement('select');
    levelSelect.style.padding = '8px';
    levelSelect.style.fontSize = '16px';
    for (let i = 1; i <= maxLevel; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.text = `Level ${i}`;
        levelSelect.appendChild(option);
    }
    levelSelect.value = currentLevel;
    levelSelect.onchange = () => {
        if (isGeneratingMaze) return;
        currentLevel = parseInt(levelSelect.value);
        player = { x: 1, y: 1 };
        generateMaze();
        drawMaze();
    };
    
    controlsDiv.appendChild(backButton);
    controlsDiv.appendChild(newGameButton);
    controlsDiv.appendChild(levelSelect);
    canvas.parentElement.appendChild(controlsDiv);
}

// Initialize the game
showWelcomeScreen();

document.addEventListener('keydown', (e) => {
    if (gameStarted) {
        handleKeyPress(e);
    }
}); 