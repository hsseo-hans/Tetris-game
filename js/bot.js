// js/bot.js
import { COLS, ROWS, BLK } from './constants.js';
import { createPiece, rotate, collide, merge, genGarbage } from './core.js';

// [난이도 재설정]
const DIFFICULTY_SETTINGS = {
    easy: {
        dropInterval: 400,   // [상향] 기존 Normal 속도
        errorRate: 0.20,     // 실수 확률 조금 낮춤
        weights: { lines: 10, height: -0.5, holes: -1, bumpiness: -0.5 }
    },
    normal: {
        dropInterval: 200,   // [상향] 기존 Hard 속도
        errorRate: 0.05,     // 꽤 잘함
        weights: { lines: 20, height: -1.0, holes: -5, bumpiness: -2 }
    },
    hard: {
        dropInterval: 150,   // [상향] 기존 Hard보다 조금 더 빠름
        errorRate: 0.01,     // 실수 거의 없음
        weights: { lines: 30, height: -5, holes: -20, bumpiness: -5 }
    },
    superHard: {
        dropInterval: 60,    // [최상] 매우 빠름
        errorRate: 0.0,      // 완벽함
        weights: { lines: 50, height: -10, holes: -100, bumpiness: -10 }
    }
};

export class Bot {
    constructor(difficulty, attackCallback) {
        this.difficulty = difficulty;
        this.attackCallback = attackCallback;
        
        this.config = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS['normal'];
        
        this.score = 0;
        this.grid = this.createGrid();
        this.bag = [];
        this.currentPiece = null;
        this.nextPiece = null;
        
        this.dropCounter = 0;
        this.moveQueue = []; 
        this.thinking = false;
        
        // 목표 착지 지점 저장용
        this.targetMove = null; 

        this.init();
    }

    createGrid() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    init() {
        // 초기화 시 기본 쓰레기 블럭 2줄 추가
        this.grid = this.createGrid();
        this.grid[18] = genGarbage();
        this.grid[19] = genGarbage();

        this.bag = [];
        this.nextPiece = this.getPiece();
        this.spawnPiece();
    }

    getPiece() {
        if (this.bag.length === 0) {
            this.bag = 'ILJOTSZ'.split('').sort(() => Math.random() - 0.5);
        }
        return createPiece(this.bag.pop());
    }

    spawnPiece() {
        this.currentPiece = {
            matrix: this.nextPiece,
            pos: { x: 3, y: 0 }
        };
        this.nextPiece = this.getPiece();
        
        if (collide(this.grid, this.currentPiece)) {
            this.score = 0; 
            this.init(); 
        } else {
            this.thinking = true;
            this.planMove();
        }
    }

    planMove() {
        // 초고수는 딜레이 없음, 고수도 딜레이 최소화
        let thinkDelay = 50;
        if (this.difficulty === 'superHard') thinkDelay = 0;
        if (this.difficulty === 'hard') thinkDelay = 20;

        setTimeout(() => {
            if (!this.currentPiece) return;

            // 1. 최적의 수 계산
            const bestMove = this.findBestMove();
            this.targetMove = bestMove; 

            // 실수 시뮬레이션
            if (Math.random() < this.config.errorRate) {
                bestMove.x = Math.floor(Math.random() * (COLS - 2));
                bestMove.rotation = Math.floor(Math.random() * 4);
            }

            this.moveQueue = [];
            
            // 회전 명령
            for (let i = 0; i < bestMove.rotation; i++) {
                this.moveQueue.push('ROTATE');
            }
            
            // 이동 명령
            const dist = bestMove.x - this.currentPiece.pos.x;
            for (let i = 0; i < Math.abs(dist); i++) {
                this.moveQueue.push(dist > 0 ? 'RIGHT' : 'LEFT');
            }
            
            this.thinking = false;

        }, thinkDelay);
    }

    findBestMove() {
        let bestScore = -Infinity;
        let bestMove = { x: this.currentPiece.pos.x, rotation: 0, y: 0 };

        const piece = this.currentPiece.matrix;

        for (let r = 0; r < 4; r++) {
            let rotatedPiece = piece;
            for (let i = 0; i < r; i++) rotatedPiece = this.rotateMatrix(rotatedPiece);

            for (let x = -2; x < COLS; x++) {
                let y = 0;
                while (!this.checkCollide(this.grid, rotatedPiece, { x, y: y + 1 })) {
                    y++;
                }

                if (this.checkCollide(this.grid, rotatedPiece, { x, y })) continue;

                const testPos = { x, y };
                const simGrid = this.cloneGrid(this.grid);
                this.mergePiece(simGrid, rotatedPiece, testPos);

                const score = this.evaluateGrid(simGrid);

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = { x, rotation: r, y: y }; 
                }
            }
        }
        return bestMove;
    }

    evaluateGrid(grid) {
        let lines = 0;
        let holes = 0;
        let bumpiness = 0;
        let aggregateHeight = 0;

        const colHeights = new Array(COLS).fill(0);
        for (let x = 0; x < COLS; x++) {
            let foundBlock = false;
            for (let y = 0; y < ROWS; y++) {
                if (grid[y][x] !== 0) {
                    if (!foundBlock) {
                        colHeights[x] = ROWS - y;
                        foundBlock = true;
                    }
                } else if (foundBlock) {
                    holes++; 
                }
            }
            aggregateHeight += colHeights[x];
        }

        lines = grid.reduce((acc, row) => acc + (row.every(val => val !== 0) ? 1 : 0), 0);

        for (let x = 0; x < COLS - 1; x++) {
            bumpiness += Math.abs(colHeights[x] - colHeights[x + 1]);
        }

        const w = this.config.weights;
        return (lines * w.lines) + 
               (aggregateHeight * w.height) + 
               (holes * w.holes) + 
               (bumpiness * w.bumpiness);
    }

    update(dt) {
        if (!this.currentPiece) return;
        if (this.thinking) return; 

        this.dropCounter += dt;

        // 1. 이동 큐 처리
        if (this.moveQueue.length > 0) {
            const cmd = this.moveQueue.shift();
            if (cmd === 'ROTATE') this.rotatePiece();
            else if (cmd === 'LEFT') this.move(-1);
            else if (cmd === 'RIGHT') this.move(1);
            return; 
        }

        // 2. [지연 하드 드롭] 고수 & 초고수 전용
        if (this.targetMove) {
            const currentY = this.currentPiece.pos.y;
            const targetY = this.targetMove.y;
            let dropThreshold = 0;

            // 난이도별 낙하 지점 설정
            if (this.difficulty === 'superHard') {
                dropThreshold = 0.5; // 50% 지점에서 낙하 (더 빠름)
            } else if (this.difficulty === 'hard') {
                dropThreshold = 0.6; // 60% 지점에서 낙하 (3/5 지점)
            }

            if (dropThreshold > 0 && targetY > 0 && currentY >= targetY * dropThreshold) {
                this.hardDrop();
                return;
            }
        }

        // 3. 일반 낙하
        if (this.dropCounter > this.config.dropInterval) {
            this.drop();
        }
    }

    drop() {
        this.currentPiece.pos.y++;
        if (collide(this.grid, this.currentPiece)) {
            this.currentPiece.pos.y--;
            this.lockPiece();
        } else {
            this.dropCounter = 0;
        }
    }

    hardDrop() {
        while (!collide(this.grid, this.currentPiece)) {
            this.currentPiece.pos.y++;
        }
        this.currentPiece.pos.y--; 
        this.lockPiece();
    }

    lockPiece() {
        merge(this.grid, this.currentPiece);
        this.checkLines();
        this.spawnPiece();
        this.dropCounter = 0;
        this.targetMove = null; 
    }

    move(dir) {
        this.currentPiece.pos.x += dir;
        if (collide(this.grid, this.currentPiece)) {
            this.currentPiece.pos.x -= dir;
        }
    }

    rotatePiece() {
        rotate(this.currentPiece.matrix);
        if (collide(this.grid, this.currentPiece)) {
            this.currentPiece.pos.x += 1;
            if (collide(this.grid, this.currentPiece)) {
                this.currentPiece.pos.x -= 2;
                if (collide(this.grid, this.currentPiece)) {
                    this.currentPiece.pos.x += 1;
                    rotate(this.currentPiece.matrix, true);
                }
            }
        }
    }

    checkLines() {
        let lines = 0;
        outer: for (let y = ROWS - 1; y > 0; --y) {
            for (let x = 0; x < COLS; ++x) {
                if (this.grid[y][x] === 0) continue outer;
            }
            this.grid.splice(y, 1)[0].fill(0);
            this.grid.unshift(new Array(COLS).fill(0));
            ++y;
            lines++;
        }
        
        if (lines > 0) {
            this.score += lines * 100;
            if (this.attackCallback) this.attackCallback(lines);
        }
    }

    receiveAtk(lines) {
        for(let i=0; i<lines; i++) {
            this.grid.shift();
            const row = new Array(COLS).fill(8); 
            row[Math.floor(Math.random() * COLS)] = 0;
            this.grid.push(row);
        }
    }

    getRenderGrid() {
        if (!this.currentPiece) return this.grid;
        
        const renderGrid = this.grid.map(row => [...row]);
        const m = this.currentPiece.matrix;
        const {x, y} = this.currentPiece.pos;

        m.forEach((row, dy) => {
            row.forEach((val, dx) => {
                if (val !== 0) {
                    const gy = y + dy;
                    const gx = x + dx;
                    if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
                        renderGrid[gy][gx] = val;
                    }
                }
            });
        });
        return renderGrid;
    }

    cloneGrid(grid) {
        return grid.map(row => [...row]);
    }
    
    rotateMatrix(matrix) {
        const N = matrix.length;
        return matrix.map((row, i) =>
            row.map((val, j) => matrix[N - 1 - j][i])
        );
    }
    
    checkCollide(grid, matrix, pos) {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < matrix[y].length; ++x) {
                if (matrix[y][x] !== 0 &&
                    (grid[y + pos.y] && grid[y + pos.y][x + pos.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }
    
    mergePiece(grid, matrix, pos) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    if(grid[y + pos.y] && grid[y + pos.y][x + pos.x] !== undefined) {
                        grid[y + pos.y][x + pos.x] = value;
                    }
                }
            });
        });
    }
}