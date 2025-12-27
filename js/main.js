import { COLS, ROWS, BLK, COLORS, DEFAULT_SVG, STRINGS } from './constants.js';
import { genGarbage, createPiece, rotate, collide, merge } from './core.js';
import { audioCtx, initAudio, playBGM, stopBGM, playSFX, playEndSound, toggleAudioMute, setAudioVolume } from './audio.js';
import { Bot } from './bot.js';

const state = {
    grid: [], opponent: { grid:[], score:0, isAI:true, bot:null },
    player: { pos:{x:0,y:0}, matrix:null, score:0 },
    stats: { atk:0, rec:0 },
    record: { win:0, lose:0 },
    difficulty: 'normal',
    bag: [], next: null, run: false, isPaused: false,
    dropCounter: 0, dropInterval: 1000, lastTime: 0,
    startTime: 0, 
    duration: 120000,   // 2분
    pauseStartTime: 0,  
    animationId: null,
    currentBGM: 'classicA',
    curLang: 'en'
};

const canvasMe = document.getElementById('my-tetris');
const ctxMe = canvasMe.getContext('2d');
const canvasOpp = document.getElementById('opp-tetris');
const ctxOpp = canvasOpp.getContext('2d');
const canvasNext = document.getElementById('next-canvas');
const ctxNext = canvasNext.getContext('2d');

window.onload = () => {
    detectAndSetLang();
    try { loadProfile(); } catch(e) { localStorage.clear(); loadProfile(); }
    
    document.addEventListener('click', handleGlobalClick);
    
    drawGrid(ctxMe, Array(20).fill(Array(10).fill(0)), BLK);
    drawGrid(ctxOpp, Array(20).fill(Array(10).fill(0)), BLK);
    
    document.getElementById('mute-btn').onclick = (e) => {
        const muted = toggleAudioMute(e.target);
        if(muted) stopBGM();
        else if(state.run && !state.isPaused) playBGM(state.currentBGM);
    };
    document.getElementById('vol-slider').oninput = (e) => setAudioVolume(e.target.value);
    document.getElementById('bgm-select').onchange = (e) => {
        state.currentBGM = e.target.value;
        if(state.run && !state.isPaused) playBGM(state.currentBGM);
    };
    document.getElementById('bgm-select').onclick = (e) => e.stopPropagation();
    document.getElementById('vol-slider').onclick = (e) => e.stopPropagation();
    
    document.getElementById('lang-btn').onclick = (e) => { e.stopPropagation(); toggleLangMenu(); };
    document.querySelectorAll('.lang-opt').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); setLang(btn.dataset.lang); };
    });

    document.getElementById('profile-trigger').onclick = (e) => { e.stopPropagation(); document.getElementById('file-in').click(); };
    document.getElementById('file-in').onclick = (e) => e.stopPropagation();
    document.getElementById('file-in').onchange = handleFile;
    document.getElementById('nick-in').onclick = (e) => e.stopPropagation(); 
    
    document.getElementById('start-btn').onclick = (e) => { e.stopPropagation(); startCountdown(); };
    document.getElementById('quit-btn').onclick = (e) => { e.stopPropagation(); quitGame(); };
    document.getElementById('restart-btn').onclick = (e) => { e.stopPropagation(); restart(); };
    
    document.querySelectorAll('.btn-diff').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); setDifficulty(btn.dataset.diff); };
    });
};

function handleGlobalClick(e) {
    initAudio(); 
    if (!state.run || !document.getElementById('lobby').classList.contains('hidden')) return;
    if (e.target.closest('button, input, select, label, .profile-container, #audio-ctrl, #lang-ctrl, .diff-ctrl')) return;
    togglePause();
}

function togglePause() {
    state.isPaused = !state.isPaused;
    if (state.isPaused) {
        state.pauseStartTime = Date.now();
        cancelAnimationFrame(state.animationId);
        if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
        document.getElementById('timer').style.opacity = '0.3';
        document.getElementById('game-title').innerText = "PAUSED"; 
    } else {
        if (state.pauseStartTime > 0) {
            state.startTime += (Date.now() - state.pauseStartTime);
            state.pauseStartTime = 0;
        }
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        state.lastTime = performance.now(); 
        document.getElementById('timer').style.opacity = '1';
        document.getElementById('game-title').innerText = STRINGS[state.curLang].title;
        loop();
    }
}

function detectAndSetLang() {
    const browserLang = navigator.language || navigator.userLanguage; 
    if(browserLang.includes('ko')) setLang('ko');
    else if(browserLang.includes('ja')) setLang('ja');
    else setLang('en');
}
function setLang(lang) {
    state.curLang = lang;
    const S = STRINGS[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(S[key]) el.innerText = S[key];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const key = el.getAttribute('data-i18n-ph');
        if(S[key]) el.placeholder = S[key];
    });
    document.body.className = '';
    if(lang === 'ko') document.body.classList.add('font-ko');
    else if(lang === 'ja') document.body.classList.add('font-ja');
    else document.body.classList.add('font-en');
    updateCreditsUI(lang);
    const nickIn = document.getElementById('nick-in');
    if(!nickIn.value) {
        document.getElementById('my-nick-side').innerText = S.me;
        document.getElementById('game-my-label').innerText = S.me;
    }
    const resArea = document.getElementById('result-area');
    if (getComputedStyle(resArea).display !== 'none') {
        const txt = document.getElementById('res-text');
        if (txt.classList.contains('win')) txt.innerText = S.winMsg;
        else txt.innerText = S.loseMsg;
    }
    if (!state.isPaused) document.getElementById('game-title').innerText = S.title;
    document.querySelectorAll('.lang-opt').forEach(btn => btn.classList.remove('active'));
    const idx = lang === 'ko' ? 0 : lang === 'ja' ? 1 : 2;
    document.querySelectorAll('.lang-opt')[idx].classList.add('active');
    document.getElementById('lang-menu').classList.remove('show');
}
function updateCreditsUI(lang) {
    const C = STRINGS[lang].credits;
    const dateStr = new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : lang === 'ja' ? 'ja-JP' : 'en-US');
    const html = `${C.pdLabel} <span>${C.pdName}</span><br>${C.devLabel} <span>${C.devName}</span><br>${C.timeLabel} <span>${C.timeVal}</span> (${dateStr})`;
    document.getElementById('credits-area').innerHTML = html;
}
function toggleLangMenu() { document.getElementById('lang-menu').classList.toggle('show'); }
function handleFile(e) {
    if (e.target.files[0]) {
        const r = new FileReader();
        r.onload = ev => {
            const img = new Image();
            img.onload = () => {
                const c = document.createElement('canvas');
                c.width = 100; c.height = 100;
                c.getContext('2d').drawImage(img, 0, 0, 100, 100);
                const data = c.toDataURL('image/jpeg', 0.8);
                document.getElementById('preview-img').src = data;
                localStorage.setItem('tetris_img', data);
            };
            img.src = ev.target.result;
        };
        r.readAsDataURL(e.target.files[0]);
    }
}
function loadProfile() {
    const savedImg = localStorage.getItem('tetris_img') || DEFAULT_SVG;
    document.getElementById('preview-img').src = savedImg;
    document.getElementById('my-img').src = savedImg;
    const savedNick = localStorage.getItem('tetris_nick');
    if(savedNick) document.getElementById('nick-in').value = savedNick;
    const rec = JSON.parse(localStorage.getItem('tetris_record') || '{"win":0,"lose":0}');
    state.record = rec;
    const total = rec.win + rec.lose;
    const ratio = total > 0 ? rec.win / total : 0;
    if(ratio >= 0.7) setDifficulty('hard');
    else if(ratio < 0.3) setDifficulty('normal');
    updateRecordUI();
}
function saveNick() {
    const nick = document.getElementById('nick-in').value;
    if(nick) localStorage.setItem('tetris_nick', nick);
    const displayNick = nick || STRINGS[state.curLang].me;
    document.getElementById('my-nick-side').innerText = displayNick;
    document.getElementById('game-my-label').innerText = displayNick;
    document.getElementById('my-img').src = document.getElementById('preview-img').src;
}
function updateRecordUI() {
    document.getElementById('rec-win').innerText = state.record.win;
    document.getElementById('rec-lose').innerText = state.record.lose;
}

function setDifficulty(lvl) {
    state.difficulty = lvl;
    document.querySelectorAll('.btn-diff').forEach(b => b.classList.remove('active'));
    const targetBtn = document.getElementById(`btn-${lvl}`);
    if(targetBtn) targetBtn.classList.add('active');
    if(state.opponent.bot) state.opponent.bot = new Bot(state.difficulty, receiveAtkFromBot);
}

function startCountdown() {
    initAudio(); stopBGM(); saveNick();
    const m = Math.floor(state.duration / 60000);
    const s = Math.floor((state.duration % 60000) / 1000);
    document.getElementById('timer').innerText = `0${m}:${s<10?'0':''}${s}`;
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('result-area').style.display = 'none';
    document.getElementById('count-overlay').style.display = 'flex';
    const msgEl = document.getElementById('count-msg');
    if(msgEl) msgEl.innerText = (state.difficulty === 'superHard') ? STRINGS[state.curLang].superHardMsg : "";
    let count = 3;
    const cntEl = document.getElementById('count-text');
    cntEl.innerText = count;
    playSFX('count');
    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            cntEl.innerText = count;
            cntEl.style.animation = 'none';
            cntEl.offsetHeight; cntEl.style.animation = 'pop 0.5s ease-out';
            playSFX('count');
        } else {
            clearInterval(timer);
            document.getElementById('count-overlay').style.display = 'none';
            startAIGame();
        }
    }, 1000);
}

function startAIGame() {
    state.opponent.isAI = true;
    state.opponent.bot = new Bot(state.difficulty, receiveAtkFromBot); 
    document.getElementById('game-opp-label').innerText = STRINGS[state.curLang].ai;
    startGame();
}

function startGame() {
    state.run = true; state.isPaused = false;
    state.grid = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    state.grid[18] = genGarbage(); state.grid[19] = genGarbage();
    state.player.score = 0; state.stats = {atk:0, rec:0};
    state.dropCounter = 0;
    state.startTime = Date.now();
    state.lastTime = performance.now();
    state.bag = []; state.next = null;
    initNextBlock(); resetPiece(); 
    updateUI();
    document.getElementById('quit-btn').classList.remove('hidden');
    playSFX('start'); 
    playBGM(state.currentBGM);
    loop();
}

function loop(time = 0) {
    if(!state.run || state.isPaused) return; 
    const dt = time - state.lastTime;
    state.lastTime = time;
    const elapsed = Date.now() - state.startTime;
    const left = Math.max(0, state.duration - elapsed);
    const m = Math.floor(left/60000);
    const s = Math.floor((left%60000)/1000);
    document.getElementById('timer').innerText = `0${m}:${s<10?'0':''}${s}`;
    if(left <= 0) { endGame("TIME"); return; }
    state.dropCounter += dt;
    if(state.dropCounter > state.dropInterval) playerDrop();
    if(state.opponent.isAI && state.opponent.bot) {
        const res = state.opponent.bot.update(dt);
        document.getElementById('s-opp-score').innerText = state.opponent.bot.score; 
        if(res === "WIN") endGame("WIN"); 
        drawOpponent();
    }
    draw(); 
    state.animationId = requestAnimationFrame(loop);
}

function animateAttack(sender, lines, callback) {
    const srcId = sender === 'player' ? 'my-tetris' : 'opp-tetris';
    const tgtId = sender === 'player' ? 'opp-tetris' : 'my-tetris';
    const srcEl = document.getElementById(srcId);
    const tgtEl = document.getElementById(tgtId);
    if(!srcEl || !tgtEl) { if(callback) callback(); return; }
    const srcRect = srcEl.getBoundingClientRect();
    const tgtRect = tgtEl.getBoundingClientRect();
    playSFX('swoosh');
    const div = document.createElement('div');
    div.className = 'attack-projectile';
    const h = lines * 32; 
    div.style.width = srcRect.width + 'px';
    div.style.height = h + 'px';
    div.style.left = srcRect.left + 'px';
    div.style.top = (srcRect.bottom - h) + 'px'; 
    document.body.appendChild(div);
    const anim = div.animate([
        { left: srcRect.left + 'px', top: (srcRect.bottom - h) + 'px', opacity: 0.8, transform: 'scale(0.9)' },
        { left: tgtRect.left + 'px', top: (tgtRect.bottom - h) + 'px', opacity: 1, transform: 'scale(1)' }
    ], { duration: 600, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
    anim.onfinish = () => { div.remove(); if(callback) callback(); };
}

function getPieceFromBag() {
    if (state.bag.length === 0) state.bag = 'ILJOTSZ'.split('').sort(() => Math.random() - 0.5);
    return createPiece(state.bag.pop());
}
function initNextBlock() { state.next = getPieceFromBag(); }
function resetPiece() {
    state.player.matrix = state.next;
    state.next = getPieceFromBag();
    state.player.pos.y = 0; state.player.pos.x = 3;
    drawNext();
    if(collide(state.grid, state.player)) endGame("LOSE");
}
function playerDrop() {
    state.player.pos.y++;
    if(collide(state.grid, state.player)) {
        state.player.pos.y--; merge(state.grid, state.player);
        checkLines(); resetPiece(); 
    }
    state.dropCounter = 0; draw();
}
function playerHardDrop() {
    while(!collide(state.grid, state.player)) state.player.pos.y++;
    state.player.pos.y--; merge(state.grid, state.player);
    checkLines(); resetPiece(); state.dropCounter = 0; draw(); playSFX('drop');
}
function playerMove(dir) {
    state.player.pos.x += dir;
    if(collide(state.grid, state.player)) state.player.pos.x -= dir;
    draw();
}
function playerRotate() {
    rotate(state.player.matrix);
    if(collide(state.grid, state.player)) {
        state.player.pos.x += 1;
        if(collide(state.grid, state.player)) {
            state.player.pos.x -= 2;
            if(collide(state.grid, state.player)) {
                state.player.pos.x += 1; rotate(state.player.matrix, true); 
            }
        }
    }
    draw();
}
function checkLines() {
    let lines = 0;
    outer: for(let y=ROWS-1; y>0; --y) {
        for(let x=0; x<COLS; ++x) if(state.grid[y][x] === 0) continue outer;
        state.grid.splice(y, 1)[0].fill(0);
        state.grid.unshift(new Array(COLS).fill(0));
        ++y; lines++;
    }
    if(lines > 0) {
        state.player.score += lines * 100; state.stats.atk += lines;
        playSFX('clear'); updateUI();
        if(state.opponent.isAI && state.opponent.bot) {
            animateAttack('player', lines, () => {
                state.opponent.bot.receiveAtk(lines);
            });
        }
    }
}
function receiveAtkFromBot(lines) {
    animateAttack('opponent', lines, () => {
        state.stats.rec += lines; updateUI();
        for(let i=0; i<lines; i++) { state.grid.shift(); state.grid.push(genGarbage()); }
        playSFX('attack'); draw();
    });
}
function draw() {
    ctxMe.fillStyle = '#000'; ctxMe.fillRect(0,0,320,640);
    drawGrid(ctxMe, state.grid, BLK); 
    if(state.player.matrix) {
        let gy = state.player.pos.y;
        while(!collide(state.grid, {matrix:state.player.matrix, pos:{x:state.player.pos.x, y:gy+1}})) gy++;
        drawMatrix(ctxMe, state.player.matrix, {x:state.player.pos.x, y:gy}, BLK, true);
        drawMatrix(ctxMe, state.player.matrix, state.player.pos, BLK);
    }
}
function drawOpponent() {
    ctxOpp.fillStyle = '#000'; ctxOpp.fillRect(0,0,320,640);
    let g = state.opponent.grid;
    if(state.opponent.isAI && state.opponent.bot) g = state.opponent.bot.getRenderGrid();
    drawGrid(ctxOpp, g, BLK);
}
function drawGrid(ctx, grid, size) {
    grid.forEach((row, y) => row.forEach((v, x) => { if(v) drawBlock(ctx, x*size, y*size, size, v); }));
}
function drawMatrix(ctx, m, offset, size, ghost=false) {
    m.forEach((row, y) => row.forEach((v, x) => { if(v) drawBlock(ctx, (x+offset.x)*size, (y+offset.y)*size, size, v, ghost); }));
}
function drawBlock(ctx, x, y, size, c, ghost=false) {
    if(ghost) {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.strokeRect(x,y,size,size);
    } else {
        const color = COLORS[c];
        const grad = ctx.createLinearGradient(x, y, x+size, y+size);
        grad.addColorStop(0, '#fff'); grad.addColorStop(0.5, color); grad.addColorStop(1, '#000');
        ctx.fillStyle = grad; ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.strokeRect(x, y, size, size);
    }
}
function drawNext() {
    ctxNext.clearRect(0,0,150,150);
    if(state.next) {
        const bs = 40; const offX = (150 - state.next[0].length*bs)/2; const offY = (150 - state.next.length*bs)/2;
        state.next.forEach((r,y)=>r.forEach((v,x)=>{ if(v) drawBlock(ctxNext, x*bs+offX, y*bs+offY, bs, v); }));
    }
}
document.addEventListener('keydown', e => {
    if(!state.run || state.isPaused) return;
    if([32,37,38,39,40].includes(e.keyCode)) e.preventDefault();
    if(e.keyCode===37) playerMove(-1); else if(e.keyCode===39) playerMove(1);
    else if(e.keyCode===40) playerDrop(); else if(e.keyCode===38) playerRotate();
    else if(e.keyCode===32) playerHardDrop();
});

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        if(state.run) { 
            state.isPaused = true; 
            state.pauseStartTime = Date.now(); 
            cancelAnimationFrame(state.animationId); 
            document.getElementById('timer').style.opacity = '0.3';
            document.getElementById('game-title').innerText = "PAUSED"; 
        }
        if(audioCtx && audioCtx.state === 'running') audioCtx.suspend();
    }
});

function updateUI() {
    document.getElementById('s-my-score').innerText = state.player.score;
    document.getElementById('s-atk').innerText = state.stats.atk;
    document.getElementById('s-rec').innerText = state.stats.rec;
}

function quitGame() { 
    if(!state.run) return; 
    stopBGM(); 
    endGame("LOSE"); 
}

function endGame(res) {
    state.run = false; stopBGM();
    document.getElementById('quit-btn').classList.add('hidden');
    document.getElementById('result-area').style.display='flex';
    document.getElementById('game-title').innerText = STRINGS[state.curLang].title;
    document.getElementById('timer').style.opacity = '1';

    const txt = document.getElementById('res-text');
    if(res === "WIN") {
        txt.innerText = STRINGS[state.curLang].winMsg;
        txt.classList.add('win'); 
        fireConfetti(); // 이 함수 안에서 폭죽 소리를 재생하도록 수정됨
        playEndSound('win'); 
        state.record.win++;
    } else {
        txt.innerText = STRINGS[state.curLang].loseMsg;
        txt.classList.remove('win');
        playEndSound('lose'); 
        state.record.lose++;
    }
    localStorage.setItem('tetris_record', JSON.stringify(state.record));
    updateRecordUI();
}

function restart() {
    document.getElementById('result-area').style.display='none';
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    startCountdown();
}

// [수정] 폭죽 효과 + 소리 재생 기능 추가
function fireConfetti(){
    const e = Date.now() + 3000;
    (function f(){
        confetti({particleCount:5, angle:60, origin:{x:0}});
        confetti({particleCount:5, angle:120, origin:{x:1}});
        
        // [추가됨] 10% 확률로 '팡!' 소리 재생 (clear 사운드 활용)
        if (Math.random() < 0.1) {
            playSFX('clear');
        }

        if(Date.now() < e) requestAnimationFrame(f);
    })();
}