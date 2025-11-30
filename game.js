const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

let board = [];
let score = 0;
let level = 1;
let lines = 0;
let currentPiece = null;
let nextPiece = null;
let gameInterval = null;
let isPaused = false;
let isGameOver = false;
let dropSpeed = 1000;

const COLORS = {
    I: '#00f0f0',
    O: '#f0f000',
    T: '#a000f0',
    S: '#00f000',
    Z: '#f00000',
    J: '#0000f0',
    L: '#f0a000'
};

const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
};

class Piece {
    constructor(type) {
        this.type = type;
        this.shape = SHAPES[type];
        this.color = COLORS[type];
        this.x = Math.floor(COLS / 2) - Math.floor(this.shape[0].length / 2);
        this.y = 0;
    }

    draw(context, offsetX = 0, offsetY = 0) {
        context.fillStyle = this.color;
        context.strokeStyle = '#000';
        context.lineWidth = 2;

        for (let row = 0; row < this.shape.length; row++) {
            for (let col = 0; col < this.shape[row].length; col++) {
                if (this.shape[row][col]) {
                    const x = (this.x + col + offsetX) * BLOCK_SIZE;
                    const y = (this.y + row + offsetY) * BLOCK_SIZE;
                    context.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
                    context.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }
    }

    drawNext() {
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        nextCtx.fillStyle = this.color;
        nextCtx.strokeStyle = '#000';
        nextCtx.lineWidth = 2;

        const offsetX = (4 - this.shape[0].length) / 2;
        const offsetY = (4 - this.shape.length) / 2;

        for (let row = 0; row < this.shape.length; row++) {
            for (let col = 0; col < this.shape[row].length; col++) {
                if (this.shape[row][col]) {
                    const x = (col + offsetX) * BLOCK_SIZE;
                    const y = (row + offsetY) * BLOCK_SIZE;
                    nextCtx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
                    nextCtx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }
    }

    rotate() {
        const newShape = this.shape[0].map((_, i) =>
            this.shape.map(row => row[i]).reverse()
        );

        const previousShape = this.shape;
        this.shape = newShape;

        if (this.collides()) {
            this.shape = previousShape;
        }
    }

    move(dx, dy) {
        this.x += dx;
        this.y += dy;

        if (this.collides()) {
            this.x -= dx;
            this.y -= dy;
            return false;
        }
        return true;
    }

    collides() {
        for (let row = 0; row < this.shape.length; row++) {
            for (let col = 0; col < this.shape[row].length; col++) {
                if (this.shape[row][col]) {
                    const newX = this.x + col;
                    const newY = this.y + row;

                    if (newX < 0 || newX >= COLS || newY >= ROWS) {
                        return true;
                    }

                    if (newY >= 0 && board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}

function initBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function drawBoard() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col]) {
                ctx.fillStyle = board[row][col];
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.fillRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                ctx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE);
        ctx.stroke();
    }
}

function draw() {
    drawBoard();
    if (currentPiece) {
        currentPiece.draw(ctx);
    }
}

function getRandomPiece() {
    const pieces = Object.keys(SHAPES);
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    return new Piece(randomPiece);
}

function mergePiece() {
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                const boardY = currentPiece.y + row;
                const boardX = currentPiece.x + col;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        }
    }
}

function clearLines() {
    let linesCleared = 0;

    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== 0)) {
            board.splice(row, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            row++;
        }
    }

    if (linesCleared > 0) {
        lines += linesCleared;

        const points = [0, 100, 300, 500, 800];
        score += points[linesCleared] * level;

        level = Math.floor(lines / 10) + 1;
        dropSpeed = Math.max(100, 1000 - (level - 1) * 100);

        updateScore();

        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, dropSpeed);
        }
    }
}

function updateScore() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

function gameOver() {
    isGameOver = true;
    clearInterval(gameInterval);
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.remove('hidden');
}

function spawnPiece() {
    currentPiece = nextPiece || getRandomPiece();
    nextPiece = getRandomPiece();
    nextPiece.drawNext();

    if (currentPiece.collides()) {
        gameOver();
    }
}

function gameLoop() {
    if (isPaused || isGameOver) return;

    if (!currentPiece.move(0, 1)) {
        mergePiece();
        clearLines();
        spawnPiece();
    }

    draw();
}

function hardDrop() {
    while (currentPiece.move(0, 1)) {
        score += 2;
    }
    updateScore();
    mergePiece();
    clearLines();
    spawnPiece();
    draw();
}

function startGame() {
    initBoard();
    score = 0;
    level = 1;
    lines = 0;
    dropSpeed = 1000;
    isPaused = false;
    isGameOver = false;

    updateScore();
    document.getElementById('gameOver').classList.add('hidden');

    nextPiece = getRandomPiece();
    spawnPiece();

    if (gameInterval) {
        clearInterval(gameInterval);
    }
    gameInterval = setInterval(gameLoop, dropSpeed);

    draw();
}

function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;

    if (isPaused) {
        clearInterval(gameInterval);
    } else {
        gameInterval = setInterval(gameLoop, dropSpeed);
    }
}

document.addEventListener('keydown', (e) => {
    if (isGameOver || !currentPiece) return;

    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            if (!isPaused) {
                currentPiece.move(-1, 0);
                draw();
            }
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (!isPaused) {
                currentPiece.move(1, 0);
                draw();
            }
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (!isPaused) {
                if (currentPiece.move(0, 1)) {
                    score += 1;
                    updateScore();
                }
                draw();
            }
            break;
        case 'ArrowUp':
            e.preventDefault();
            if (!isPaused) {
                currentPiece.rotate();
                draw();
            }
            break;
        case ' ':
            e.preventDefault();
            if (!isPaused) {
                hardDrop();
            }
            break;
        case 'p':
        case 'P':
            e.preventDefault();
            togglePause();
            break;
    }
});

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

// Touch controls for mobile
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
const SWIPE_THRESHOLD = 30;
const TAP_THRESHOLD = 200;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();

    if (isGameOver || !currentPiece || isPaused) return;

    const touch = e.changedTouches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    const touchEndTime = Date.now();

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const deltaTime = touchEndTime - touchStartTime;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Check for tap (rotation)
    if (absX < SWIPE_THRESHOLD && absY < SWIPE_THRESHOLD && deltaTime < TAP_THRESHOLD) {
        currentPiece.rotate();
        draw();
        return;
    }

    // Swipe detection
    if (absX > absY && absX > SWIPE_THRESHOLD) {
        // Horizontal swipe
        if (deltaX > 0) {
            currentPiece.move(1, 0);
        } else {
            currentPiece.move(-1, 0);
        }
        draw();
    } else if (absY > absX && absY > SWIPE_THRESHOLD) {
        // Vertical swipe
        if (deltaY > 0) {
            hardDrop();
        }
    }
}, { passive: false });

initBoard();
draw();
