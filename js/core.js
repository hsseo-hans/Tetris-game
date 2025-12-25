import { COLS } from './constants.js';

export function genGarbage() { 
    const r = Array(COLS).fill(8); 
    r[Math.random()*COLS|0]=0; 
    return r; 
}

export function createPiece(t) {
    if(t==='I') return [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]];
    if(t==='L') return [[0,2,0],[0,2,0],[0,2,2]];
    if(t==='J') return [[0,3,0],[0,3,0],[3,3,0]];
    if(t==='O') return [[4,4],[4,4]];
    if(t==='Z') return [[5,5,0],[0,5,5],[0,0,0]];
    if(t==='S') return [[0,6,6],[6,6,0],[0,0,0]];
    if(t==='T') return [[0,7,0],[7,7,7],[0,0,0]];
}

export function rotate(m, rev) { 
    for(let y=0; y<m.length; ++y) 
        for(let x=0; x<y; ++x) [m[x][y], m[y][x]] = [m[y][x], m[x][y]]; 
    if(rev) m.reverse(); 
    else m.forEach(r=>r.reverse()); 
}

export function collide(g, p) { 
    const m=p.matrix||p, o=p.pos||{x:0,y:0}; 
    for(let y=0; y<m.length; ++y) 
        for(let x=0; x<m[y].length; ++x) 
            if(m[y][x]!==0 && (g[y+o.y] && g[y+o.y][x+o.x])!==0) return true; 
    return false; 
}

export function merge(g, p) { 
    p.matrix.forEach((r,y)=>r.forEach((v,x)=>{ 
        if(v && g[y+p.pos.y]) g[y+p.pos.y][x+p.pos.x]=v; 
    })); 
}