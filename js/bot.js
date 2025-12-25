import { ROWS, COLS } from './constants.js';
import { genGarbage, createPiece, collide, merge, rotate } from './core.js';

export class Bot {
    constructor(diff, receiveAtkCallback) {
        this.grid = Array.from({length:ROWS}, ()=>Array(COLS).fill(0));
        this.grid[18] = genGarbage(); this.grid[19] = genGarbage();
        this.score=0; this.timer=0;
        this.receiveAtkCallback = receiveAtkCallback;
        
        // 난이도별 설정
        if(diff === 'easy') { 
            this.speed = 800; 
            this.weights = {lines:10, holes:-1, height:0, bumps:0}; 
        }
        else if(diff === 'normal') { 
            this.speed = 400; 
            this.weights = {lines:20, holes:-10, height:-2, bumps:-2}; 
        }
        else if(diff === 'hard') { 
            this.speed = 200; 
            this.weights = {lines:100, holes:-50, height:-10, bumps:-10}; 
        }
        else { // superHard (초고수)
            this.speed = 80; 
            // 공격형 AI: 라인 클리어 우선, 구멍 생성 극혐
            this.weights = {lines:500, holes:-200, height:-30, bumps:-30}; 
        }

        this.spawn();
    }
    spawn() {
        this.piece = createPiece('ILJOTSZ'[Math.random()*7|0]);
        this.pos = {x:3, y:0};
        this.target = this.think();
        if(collide(this.grid, {matrix:this.piece, pos:this.pos})) return "WIN"; 
    }
    update(dt) {
        this.timer += dt;
        if(this.timer > this.speed) {
            if(this.target) {
                this.piece = this.target.matrix; 
                if(this.pos.x < this.target.x) this.pos.x++;
                else if(this.pos.x > this.target.x) this.pos.x--;
                if(!collide(this.grid, {matrix:this.piece, pos:{x:this.pos.x, y:this.pos.y+1}})) { this.pos.y++; } 
                else { return this.lock(); }
            }
            this.timer = 0;
        }
        return null;
    }
    lock() {
        merge(this.grid, {matrix:this.piece, pos:this.pos});
        let l=0;
        for(let y=ROWS-1; y>=0; y--) {
            if(this.grid[y].every(v=>v!==0)) {
                this.grid.splice(y,1); this.grid.unshift(new Array(COLS).fill(0));
                y++; l++;
            }
        }
        if(l>0) { 
            this.score += l*100; 
            if(this.receiveAtkCallback) this.receiveAtkCallback(l);
        }
        return this.spawn();
    }
    receiveAtk(l) { for(let i=0;i<l;i++) { this.grid.shift(); this.grid.push(genGarbage()); } }
    getRenderGrid() {
        const g = this.grid.map(r => [...r]);
        if(this.piece) {
            this.piece.forEach((r,y)=>r.forEach((v,x)=>{
                if(v && g[y+this.pos.y] && g[y+this.pos.y][x+this.pos.x]!==undefined) g[y+this.pos.y][x+this.pos.x]=v;
            }));
        }
        return g;
    }
    think() {
        let best = {score:-999999, x:0, matrix:this.piece};
        for(let r=0; r<4; r++) {
            let p = this.piece.map(r=>[...r]);
            for(let i=0; i<r; i++) rotate(p);
            for(let x=-2; x<8; x++) {
                let y=0;
                if(collide(this.grid, {matrix:p, pos:{x,y}})) continue;
                while(!collide(this.grid, {matrix:p, pos:{x,y:y+1}})) y++;
                
                let tempGrid = this.grid.map(row => [...row]);
                p.forEach((row, py) => row.forEach((val, px) => {
                    if(val && tempGrid[y+py]) tempGrid[y+py][x+px] = val;
                }));
                
                let lines = 0, holes = 0, bumps = 0, height = 0;
                for(let r=0; r<ROWS; r++) if(tempGrid[r].every(c => c!==0)) lines++;
                
                let colHeights = new Array(COLS).fill(0);
                for(let c=0; c<COLS; c++) {
                    let topFound = false;
                    for(let r=0; r<ROWS; r++) {
                        if(tempGrid[r][c] !== 0) {
                            if(!topFound) { colHeights[c] = ROWS - r; topFound = true; }
                        } else if(topFound) { holes++; }
                    }
                    height += colHeights[c];
                }
                for(let c=0; c<COLS-1; c++) bumps += Math.abs(colHeights[c] - colHeights[c+1]);

                let score = (lines * this.weights.lines) + (holes * this.weights.holes) + (height * this.weights.height) + (bumps * this.weights.bumps);
                
                if(score > best.score) best = {score, x, matrix:p};
            }
        }
        return best;
    }
}