const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const CELL_SIZE = 25;
const BASE_GRID_SIZE = 20; // Increased base size for early levels
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

// Get current grid size based on level
function getCurrentGridSize() {
    // Early levels now start bigger
    if (currentLevel <= 5) {
        return BASE_GRID_SIZE + Math.floor(currentLevel * 0.8);
    }
    return BASE_GRID_SIZE + Math.floor(currentLevel * 0.5);
}

// Generate a maze using recursive backtracking with enhanced complexity for early levels
function generateMaze() {
    if (isGeneratingMaze) return;
    isGeneratingMaze = true;
    
    try {
        const GRID_SIZE = getCurrentGridSize();
        player = { x: 1, y: 1 };
        
        // For early levels, randomize exit position
        if (currentLevel <= 5) {
            const side = Math.floor(Math.random() * 4);
            switch(side) {
                case 0: // Top
                    exit = { x: Math.floor(GRID_SIZE/2), y: 1 };
                    break;
                case 1: // Right
                    exit = { x: GRID_SIZE - 2, y: Math.floor(GRID_SIZE/2) };
                    break;
                case 2: // Bottom
                    exit = { x: Math.floor(GRID_SIZE/2), y: GRID_SIZE - 2 };
                    break;
                case 3: // Left
                    exit = { x: 1, y: Math.floor(GRID_SIZE/2) };
                    break;
            }
        } else {
            exit = { x: GRID_SIZE - 2, y: GRID_SIZE - 2 };
        }
        
        // Initialize maze with walls
        maze = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(1));
        
        // Create main path
        createSinglePath();
        
        // Add extra complexity for early levels
        if (currentLevel <= 5) {
            addEarlyLevelComplexity(GRID_SIZE);
        }
        
        timeStarted = Date.now();
    } finally {
        isGeneratingMaze = false;
    }
}

function createSinglePath() {
    const GRID_SIZE = getCurrentGridSize();
    const visited = new Set();
    const stack = [{x: 1, y: 1}];
    maze[1][1] = 0;
    
    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const {x, y} = current;
        const key = `${x},${y}`;
        visited.add(key);
        
        // Get possible directions with weighted randomization for early levels
        const directions = [];
        if (x < GRID_SIZE - 2) {
            // Add right direction multiple times for early levels to create longer paths
            const weight = currentLevel <= 5 ? 3 : 1;
            for (let i = 0; i < weight; i++) {
                directions.push({dx: 2, dy: 0});
            }
        }
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
    
    // Ensure path to exit
    const pathToExit = findPathToExit(GRID_SIZE);
    pathToExit.forEach(({x, y}) => {
        maze[y][x] = 0;
    });
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

function addEarlyLevelComplexity(GRID_SIZE) {
    // Add strategic walls to create longer paths
    for (let i = 0; i < currentLevel * 3; i++) {
        const x = 2 + Math.floor(Math.random() * (GRID_SIZE - 4));
        const y = 2 + Math.floor(Math.random() * (GRID_SIZE - 4));
        
        // Only add wall if it doesn't block the main path
        if (maze[y][x] === 0 && !isPathBlocked(x, y, GRID_SIZE)) {
            maze[y][x] = 1;
        }
    }
}

function isPathBlocked(wallX, wallY, GRID_SIZE) {
    // Temporarily add wall
    const originalValue = maze[wallY][wallX];
    maze[wallY][wallX] = 1;
    
    // Check if path exists
    const visited = new Set();
    const stack = [{x: player.x, y: player.y}];
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
            
            // Check all adjacent cells
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
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw maze
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
        ctx.fillStyle = `rgba(76, 175, 80, ${1 - frame/totalFrames})`;
        ctx.fill();
        
        frame++;
        requestAnimationFrame(animate);
    }
    
    animate();
}

function drawMazeBase() {
    const GRID_SIZE = getCurrentGridSize();
    
    // Draw walls
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (maze[y][x] === 1) {
                ctx.fillStyle = '#333';
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }
    
    // Draw exit
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(exit.x * CELL_SIZE, exit.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    
    // Draw player
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(
        player.x * CELL_SIZE + (CELL_SIZE - PLAYER_SIZE) / 2,
        player.y * CELL_SIZE + (CELL_SIZE - PLAYER_SIZE) / 2,
        PLAYER_SIZE,
        PLAYER_SIZE
    );
    
    // Draw level info
    ctx.fillStyle = '#000';
    ctx.font = '20px Arial';
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
    } else {
        alert('Congratulations! You\'ve completed all levels!');
        currentLevel = 1;
    }
    
    player = { x: 1, y: 1 };
    generateMaze();
    drawMaze();
    
    const levelSelect = document.querySelector('select');
    if (levelSelect) {
        levelSelect.value = currentLevel;
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
    controlsDiv.style.marginTop = '10px';
    controlsDiv.style.display = 'flex';
    controlsDiv.style.gap = '10px';
    controlsDiv.style.justifyContent = 'center';
    
    // New Game button
    const newGameButton = document.createElement('button');
    newGameButton.textContent = 'New Game';
    newGameButton.style.padding = '8px 16px';
    newGameButton.style.fontSize = '16px';
    newGameButton.onclick = () => {
        if (isGeneratingMaze) return;
        currentLevel = 1;
        player = { x: 1, y: 1 };
        generateMaze();
        drawMaze();
        
        // Update level selector
        const levelSelect = document.querySelector('select');
        if (levelSelect) {
            levelSelect.value = currentLevel;
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
    
    controlsDiv.appendChild(newGameButton);
    controlsDiv.appendChild(levelSelect);
    canvas.parentElement.appendChild(controlsDiv);
}

// Initialize the game
generateMaze();
drawMaze();
addControls();
document.addEventListener('keydown', handleKeyPress); 