// ==================== CẤU TRÚC DỮ LIỆU CỐT LÕI ====================

// Class Point đại diện cho 1 điểm/nước đi trên bàn cờ.
class Point {
    // Hàm khởi tạo các giá trị
    constructor(x, y, playerID) {
        this.x = x; // Tọa độ hàng (row)
        this.y = y; // Tọa độ cột (column)
        this.playerID = playerID; // ID người chơi thực hiện nước đi (1 hoặc 2 để tối ưu bộ nhớ thay vì dùng string 'X'/'O')
    }
    // Các hàm Setter để cập nhật giá trị (đảm bảo tính đóng gói nếu cần mở rộng logic validation sau này)
    SetX(x) { this.x = x; }
    SetY(y) { this.y = y; }
    SetPlayerID(id) { this.playerID = id; }
}

/**
 * Class Stack định nghĩa cấu trúc dữ liệu Ngăn xếp (LIFO - Last In First Out).
 * Ứng dụng để lưu trữ lịch sử nước đi, phục vụ trực tiếp cho tính năng Undo.
 * Việc triển khai Stack bằng Array cấp phát tĩnh giúp quản lý bộ nhớ tốt hơn, tránh phân mảnh bộ nhớ khi Push/Pop liên tục.
 */
class Stack {
    // Khởi tạo Stack với kích thước tối đa (maxSize = size * size của bàn cờ)
    constructor(maxSize) {
        this.MAX = maxSize; // Số phần tử tối đa mà stack có thể chứa
        this.elements = new Array(this.MAX); // Mảng cố định phần tử để lưu trữ các object Point
        this.topIndex = -1; // Con trỏ chỉ định đỉnh của stack. -1 nghĩa là stack đang rỗng (O(1) access)
    }
    
    // Các hàm thao tác trên Stack (Tất cả đều có độ phức tạp O(1))
    
    // Làm rỗng stack bằng cách dời con trỏ về -1 (không cần xóa vật lý các phần tử để tối ưu hiệu năng)
    MakeNullStack() { this.topIndex = -1; }
    
    // Thêm một nước đi (Point) vào đỉnh stack nếu chưa đầy
    Push(point) { if (!this.IsFull()) this.elements[++this.topIndex] = point; }
    
    // Lấy và xóa nước đi trên đỉnh stack. Trả về null nếu stack rỗng.
    Pop() { return this.IsEmpty() ? null : this.elements[this.topIndex--]; }
    
    // Xem phần tử ở đỉnh stack mà không xóa nó
    Top() { return this.IsEmpty() ? null : this.elements[this.topIndex]; }
    
    // Kiểm tra trạng thái stack
    IsEmpty() { return this.topIndex === -1; }
    IsFull() { return this.topIndex === this.MAX - 1; }
}

// ==================== KHỞI TẠO BIẾN TOÀN CỤC ====================
// Biến trạng thái quản lý State của toàn bộ Game
let size = 15; // Số ô theo chiều của bàn cờ (mặc định 15x15)
let winCondition = 5; // Số quân cờ liên tiếp cần để thắng
let boardMatrix = []; // Ma trận 2 chiều lưu trữ trạng thái logic của bàn cờ (0: trống, 1: X, 2: O)
let moveStack = null; // Khởi tạo con trỏ cho Stack chứa lịch sử đánh
let currentPlayer = 1; // Đánh dấu lượt chơi hiện tại (1 đại diện cho X, 2 đại diện cho O)
let isGameOver = false; // Flag true: thắng hoặc hoà-> khoá, false: có thể tiếp tục chơi

// Tham chiếu đến các DOM Element trên giao diện
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');

// ==================== TERMINAL LOG (CMD) ====================
// Quản lý UI phần Terminal hiển thị log cho các thao tác Push/Pop
const logArea = document.getElementById('log-area');
const logOutput = document.getElementById('log-output');

// Toggle hiển thị/ẩn Terminal
document.getElementById('btnToggleLog').addEventListener('click', () => {
    logArea.style.display = logArea.style.display === 'none' ? 'block' : 'none';
});

/**
 * Hàm ghi log vào giao diện giả lập Terminal.
 * @param {string} message - Nội dung thông báo
 * @param {string} typeClass - Class CSS để tô màu (success, error, ...)
 */
function LogMessage(message, typeClass = '') {
    const time = new Date().toLocaleTimeString('vi-VN'); // Lấy timestamp hiện tại
    const p = document.createElement('p');
    p.className = typeClass;
    p.textContent = `[${time}] ${message}`;
    
    logOutput.appendChild(p);
    // Tự động cuộn xuống dòng log mới nhất để UX giống terminal thật
    logOutput.scrollTop = logOutput.scrollHeight;
}

// ==================== HÀM LOGIC GAME ====================

/**
 * Khởi tạo cấu trúc dữ liệu của bàn cờ.
 * Sử dụng Array.fill() và map() để tạo ma trận 2 chiều size * size, khởi tạo toàn bộ bằng giá trị 0.
 */
function CreateBoard() {
    boardMatrix = Array(size).fill().map(() => Array(size).fill(0));
    moveStack = new Stack(size * size); // Khởi tạo bộ nhớ cho Stack dựa trên kích thước bàn cờ
}

/**
 * Render bàn cờ từ dữ liệu logic ra DOM (HTML).
 * Sử dụng CSS Grid để tạo layout bàn cờ linh hoạt theo biến `size`.
 */
function RenderBoard() {
    boardEl.innerHTML = ''; // Xóa sạch bàn cờ cũ
    boardEl.style.gridTemplateColumns = `repeat(${size}, 30px)`;
    boardEl.style.gridTemplateRows = `repeat(${size}, 30px)`;
    
    // Duyệt ma trận với chi phí O(N^2) để tạo các cell
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${r}-${c}`; // Gán ID để truy xuất O(1) khi cần update riêng lẻ 1 ô
            cell.style.width = '30px';
            cell.style.height = '30px';
            // Closure binding: Bắt sự kiện click cho từng ô
            cell.addEventListener('click', () => PlacePiece(r, c));
            boardEl.appendChild(cell);
        }
    }
}

/**
 * Cập nhật giao diện của 1 ô cụ thể sau khi đánh hoặc Undo.
 * Chi phí truy xuất DOM là O(1) nhờ tìm theo ID duy nhất.
 */
function RenderCell(r, c, playerID) {
    const cell = document.getElementById(`cell-${r}-${c}`);
    if (playerID === 1) {
        cell.textContent = 'X'; cell.className = 'cell x';
    } else if (playerID === 2) {
        cell.textContent = 'O'; cell.className = 'cell o';
    } else {
        // Trạng thái reset/undo (playerID = 0)
        cell.textContent = ''; cell.className = 'cell';
    }
}

// Kiểm tra xem ô cờ hiện tại có trống không (chống đè quân)
function IsEmptyCell(r, c) { return boardMatrix[r][c] === 0; }

// Gọi chuỗi hàm khởi tạo dữ liệu logic và render giao diện
function ResetBoard() { CreateBoard(); RenderBoard(); }

// Xử lý sự kiện khi thay đổi kích thước bàn cờ (ví dụ chuyển 3x3 sang 15x15)
function StartGame() {
    const sizeSelect = document.getElementById('boardSize');
    size = parseInt(sizeSelect.value);
    // Dynamic rules: Cờ caro truyền thống (5), Tic-Tac-Toe (3)
    winCondition = size === 3 ? 3 : 5;
    Reset();
}

/**
 * Reset hoàn toàn state của Game về trạng thái ban đầu.
 */
function Reset() {
    isGameOver = false; 
    currentPlayer = 1; // Luôn ưu tiên X đi trước
    ResetBoard(); 
    UpdateStatus();
    
    // Xóa trắng terminal mỗi khi reset, giữ lại giao diện sạch sẽ
    if (logOutput) {
        logOutput.innerHTML = '<p class="placeholder-text">Hệ thống sẵn sàng. Bắt đầu ghi log...</p>';
        LogMessage('Hệ thống đã Reset. Stack đã được làm rỗng.', 'log-success');
    }
}

/**
 * Logic chính xử lý sự kiện đặt quân cờ xuống bàn.
 * Gồm các bước: Validate -> Cập nhật State logic -> Cập nhật UI -> Lưu lịch sử (Push Stack) -> Kiểm tra Win/Draw -> Đảo lượt.
 */
function PlacePiece(r, c) {
    // Nếu game đã kết thúc hoặc ô đã có người đánh -> Bỏ qua thao tác (Early return)
    if (isGameOver || !IsEmptyCell(r, c)) return;

    // Cập nhật ma trận logic và DOM UI
    boardMatrix[r][c] = currentPlayer;
    RenderCell(r, c, currentPlayer);

    // Lưu vết nước đi vào Stack dưới dạng object Point để hỗ trợ Undo O(1)
    moveStack.Push(new Point(r, c, currentPlayer));
    
    const playerNameUI = currentPlayer === 1 ? 'X' : 'O';
    LogMessage(`PUSH: Người chơi ${playerNameUI} đánh tại (${r} + 1, ${c} + 1)`, 'log-success');

    // Kiểm tra ngay xem nước đi vừa rồi có tạo ra chiến thắng không
    if (CheckWin(r, c, currentPlayer)) {
        statusEl.textContent = `Người chơi ${playerNameUI} chiến thắng!`;
        LogMessage(`GAME OVER: ${playerNameUI} đã chiến thắng.`, 'log-success');
        isGameOver = true; // Khóa bàn cờ
        return;
    }
    
    // Trường hợp hòa: Stack đầy tức là không còn ô trống nào trên bàn cờ
    if (moveStack.IsFull()) {
        statusEl.textContent = "Hòa!";
        LogMessage(`DRAW: Bàn cờ kín. Stack chạm đáy. Game Hòa!`, 'log-error');
        isGameOver = true;
        return;
    }
    
    // Đảo lượt chơi sử dụng toán tử ba ngôi (Ternary operator)
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    UpdateStatus();
}

/**
 * Hoàn tác nước đi (Undo) sử dụng Stack.
 * Lấy thao tác cuối cùng ra khỏi Stack -> Xóa trạng thái của ô đó -> Đổi lượt về lại người vừa đi.
 */
function Undo() {
    // Chặn Undo nếu game đã kết thúc hoặc chưa có nước đi nào (Stack rỗng)
    if (isGameOver || moveStack.IsEmpty()) return;

    const lastMove = moveStack.Top(); // Lấy thông tin nước đi cuối cùng
    moveStack.Pop(); // Xóa nước đi đó khỏi Stack
    
    // Mapping ngược để lấy tên hiển thị UI với chi phí O(1)
    const playerNameUI = lastMove.playerID === 1 ? 'X' : 'O';
    LogMessage(`POP (Undo): Rút nước đi của ${playerNameUI} tại (${lastMove.x + 1}, ${lastMove.y + 1})`, 'log-error');

    // Rollback trạng thái: Xóa logic trong ma trận và xóa hiển thị DOM
    boardMatrix[lastMove.x][lastMove.y] = 0;
    RenderCell(lastMove.x, lastMove.y, 0);

    // Chuyển lượt chơi ngược lại cho người vừa bị Undo nước đi
    currentPlayer = lastMove.playerID;
    UpdateStatus();
}

/**
 * Thuật toán kiểm tra điều kiện thắng (Duyệt theo chiều Vector).
 * Thay vì duyệt toàn bộ bàn cờ O(N^2), hàm này chỉ quét từ điểm vừa đánh tỏa ra 4 phương (Ngang, Dọc, Chéo chính, Chéo phụ).
 * Giúp tối ưu hóa chi phí tính toán xuống mức O(K) với K là winCondition.
 */
function CheckWin(r, c, playerID) {
    // 4 hướng vector cơ bản: [0, 1] ngang, [1, 0] dọc, [1, 1] chéo chính, [1, -1] chéo phụ
    const directions = [ [0, 1], [1, 0], [1, 1], [1, -1] ];
    
    for (let [dr, dc] of directions) {
        let totalCount = 1; // Bản thân ô hiện tại được tính là 1
        
        // Cộng dồn số lượng quân cờ liên tiếp theo hướng hiện tại (dr, dc)
        totalCount += CountDirection(r, c, dr, dc, playerID);
        // Cộng dồn theo hướng đối lập ngược lại (-dr, -dc)
        totalCount += CountDirection(r, c, -dr, -dc, playerID);
        
        // Nếu tổng số quân trên đường thẳng này >= điều kiện thắng (5) => Thắng
        if (totalCount >= winCondition) return true;
    }
    return false; // Duyệt hết 4 phương 8 hướng mà không đủ quân thì chưa thắng
}

/**
 * Đếm số lượng quân cờ liên tiếp của cùng một người chơi theo một hướng vector (dr, dc) xác định.
 */
function CountDirection(r, c, dr, dc, playerID) {
    let count = 0;
    // Kiểm tra lan ra tối đa (winCondition - 1) ô
    for (let i = 1; i <= winCondition - 1; i++) {
        let nr = r + dr * i, nc = c + dc * i; // nr: new row, nc: new column
        // Điều kiện dừng: Chạm biên bàn cờ (Index Out of Bounds) hoặc bị ngắt chuỗi bởi quân địch / ô trống
        if (nr < 0 || nr >= size || nc < 0 || nc >= size || boardMatrix[nr][nc] !== playerID) break;
        count++; // Nếu là quân của mình thì tăng bộ đếm
    }
    return count;
}

// Cập nhật text hiển thị lượt đi hiện tại
function UpdateStatus() {
    if (!isGameOver) statusEl.textContent = `Lượt của: ${currentPlayer === 1 ? 'X' : 'O'}`;
}

// BINDING EVENTS (Gắn sự kiện cho các nút điều khiển UI)
document.getElementById('boardSize').addEventListener('change', StartGame);
document.getElementById('btnUndo').addEventListener('click', Undo);
document.getElementById('btnReset').addEventListener('click', Reset);

// Khởi chạy game ngay khi tải xong script
StartGame();


// ==================== LERP BACKGROUND ANIMATION ====================
// Sử dụng Linear Interpolation (Lerp) để tạo hiệu ứng bám đuổi tọa độ con trỏ chuột một cách mượt mà.

const overlay = document.getElementById('grid-background-overlay');
let targetX = 0, targetY = 0; // Tọa độ thực tế của chuột (Điểm đến)
let currentX = 0, currentY = 0; // Tọa độ hiện tại của background (Điểm đang đuổi theo)

// Lắng nghe sự kiện di chuyển thật của chuột
document.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
});

// Vòng lặp animation nội suy (Loop chạy liên tục theo tần số quét màn hình ~60FPS)
function animateBackground() {
    // Độ nhạy của delay (0.05 = 5% khoảng cách mỗi frame). Số càng nhỏ animation càng trễ/mượt (Ease-out effect)
    const lerpFactor = 0.05; 
    
    // Thuật toán Lerp: Vị trí mới = Vị trí cũ + (Khoảng cách chênh lệch * Hệ số Lerp)
    currentX += (targetX - currentX) * lerpFactor;
    currentY += (targetY - currentY) * lerpFactor;
    
    // Đẩy CSS Variables (Custom Properties) ra HTML để CSS có thể binding tạo hiệu ứng visual (VD: radial-gradient mask)
    overlay.style.setProperty('--mouse-x', `${currentX}px`);
    overlay.style.setProperty('--mouse-y', `${currentY}px`);
    
    // Yêu cầu trình duyệt gọi lại hàm này ở frame tiếp theo (Tránh nghẽn thread như setInterval/setTimeout)
    requestAnimationFrame(animateBackground);
}

// Khởi chạy Lerp (Mở khóa vòng lặp)
animateBackground();
