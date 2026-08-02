// ==================== CẤU TRÚC DỮ LIỆU CỐT LÕI ====================
class Point {
    constructor(x, y, playerName, playerID) {
        this.x = x; this.y = y; this.playerName = playerName; this.playerID = playerID; 
    }
}

class Stack {
    constructor(maxSize) {
        this.MAX = maxSize; this.elements = new Array(this.MAX); this.topIndex = -1;
    }
    MakeNullStack() { this.topIndex = -1; }
    Push(point) { if (!this.IsFull()) this.elements[++this.topIndex] = point; }
    Pop() { return this.IsEmpty() ? null : this.elements[this.topIndex--]; }
    Top() { return this.IsEmpty() ? null : this.elements[this.topIndex]; }
    IsEmpty() { return this.topIndex === -1; }
    IsFull() { return this.topIndex === this.MAX - 1; }
}

// ==================== KHỞI TẠO BIẾN TOÀN CỤC ====================
let size = 15;
let winCondition = 5;
let boardMatrix = [];
let moveStack = null;
let currentPlayer = 1; 
let isGameOver = false;

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');

// ==================== HÀM LOGIC GAME ====================
function CreateBoard() {
    boardMatrix = Array(size).fill().map(() => Array(size).fill(0));
    moveStack = new Stack(size * size);
}

function RenderBoard() {
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${size}, 30px)`;
    boardEl.style.gridTemplateRows = `repeat(${size}, 30px)`;
    
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${r}-${c}`;
            cell.style.width = '30px';
            cell.style.height = '30px';
            cell.addEventListener('click', () => PlacePiece(r, c));
            boardEl.appendChild(cell);
        }
    }
}

function RenderCell(r, c, playerID) {
    const cell = document.getElementById(`cell-${r}-${c}`);
    if (playerID === 1) {
        cell.textContent = 'X'; cell.className = 'cell x';
    } else if (playerID === 2) {
        cell.textContent = 'O'; cell.className = 'cell o';
    } else {
        cell.textContent = ''; cell.className = 'cell';
    }
}

function IsEmptyCell(r, c) { return boardMatrix[r][c] === 0; }

function ResetBoard() { CreateBoard(); RenderBoard(); }

function StartGame() {
    const sizeSelect = document.getElementById('boardSize');
    size = parseInt(sizeSelect.value);
    winCondition = size === 3 ? 3 : 5;
    Reset();
}

function Reset() {
    isGameOver = false; currentPlayer = 1;
    ResetBoard(); UpdateStatus();
}

function PlacePiece(r, c) {
    if (isGameOver || !IsEmptyCell(r, c)) return;

    boardMatrix[r][c] = currentPlayer;
    RenderCell(r, c, currentPlayer);

    const playerName = currentPlayer === 1 ? 'X' : 'O';
    moveStack.Push(new Point(r, c, playerName, currentPlayer));

    if (CheckWin(r, c, currentPlayer)) {
        statusEl.textContent = `Người chơi ${playerName} chiến thắng!`;
        isGameOver = true;
        return;
    }
    
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    UpdateStatus();
}

function Undo() {
    if (isGameOver || moveStack.IsEmpty()) return;

    const lastMove = moveStack.Top();
    moveStack.Pop();

    boardMatrix[lastMove.x][lastMove.y] = 0;
    RenderCell(lastMove.x, lastMove.y, 0);

    currentPlayer = lastMove.playerID;
    UpdateStatus();
}

function CheckWin(r, c, playerID) {
    const directions = [ [0, 1], [1, 0], [1, 1], [1, -1] ];
    for (let [dr, dc] of directions) {
        let totalCount = 1; 
        totalCount += CountDirection(r, c, dr, dc, playerID);
        totalCount += CountDirection(r, c, -dr, -dc, playerID);
        if (totalCount >= winCondition) return true;
    }
    return false;
}

function CountDirection(r, c, dr, dc, playerID) {
    let count = 0;
    for (let i = 1; i <= winCondition - 1; i++) {
        let nr = r + dr * i, nc = c + dc * i;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size || boardMatrix[nr][nc] !== playerID) break;
        count++;
    }
    return count;
}

function UpdateStatus() {
    if (!isGameOver) statusEl.textContent = `Lượt của: ${currentPlayer === 1 ? 'X' : 'O'}`;
}

// BINDING EVENTS
document.getElementById('boardSize').addEventListener('change', StartGame);
document.getElementById('btnUndo').addEventListener('click', Undo);
document.getElementById('btnReset').addEventListener('click', Reset);
StartGame();


// ==================== LERP BACKGROUND ANIMATION ====================
const overlay = document.getElementById('grid-background-overlay');
let targetX = 0, targetY = 0;
let currentX = 0, currentY = 0;

// Lắng nghe sự kiện di chuyển thật của chuột
document.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
});

// Vòng lặp animation nội suy
function animateBackground() {
    // Độ nhạy của delay (0.05 = 5% khoảng cách mỗi frame)
    const lerpFactor = 0.05; 
    
    currentX += (targetX - currentX) * lerpFactor;
    currentY += (targetY - currentY) * lerpFactor;
    
    // Đẩy CSS Variables ra HTML
    overlay.style.setProperty('--mouse-x', `${currentX}px`);
    overlay.style.setProperty('--mouse-y', `${currentY}px`);
    
    requestAnimationFrame(animateBackground);
}

// Khởi chạy Lerp
animateBackground();