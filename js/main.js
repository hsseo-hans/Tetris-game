// js/main.js
import { COLS, ROWS, BLK, COLORS, STRINGS } from './constants.js';
import { state } from './state.js';
import { genGarbage, createPiece, rotate, collide, merge } from './core.js';
import { audioCtx, initAudio, playBGM, playRandomBGM, stopBGM, playSFX, playEndSound, toggleAudioMute, setAudioVolume } from './audio.js';
import { Bot } from './bot.js';
import { updateFightLog, checkIfRanker } from './firebase.js';
import * as UI from './ui.js'; 

const canvasMe = document.getElementById('my-tetris');
const ctxMe = canvasMe.getContext('2d');
const canvasOpp = document.getElementById('opp-tetris');
const ctxOpp = canvasOpp.getContext('2d');
const canvasNext = document.getElementById('next-canvas');
const ctxNext = canvasNext.getContext('2d');

// 터치 변수
let touchStartX = 0;
let touchStartY = 0;
let touchFingerCount = 0;

window.onload = () => {
    UI.detectAndSetLang();
    try { UI.loadProfile(); } catch(e) { localStorage.clear(); UI.loadProfile(); }
    
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleGlobalKey);
    
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    // 페이지 가시성 변경 (전원 끄기/탭 전환 시 일시정지)
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && state.run && !state.isPaused && !state.isAutoMode) {
            togglePause();
        }
    });

    drawGrid(ctxMe, Array(20).fill(Array(10).fill(0)), BLK);
    drawGrid(ctxOpp, Array(20).fill(Array(10).fill(0)), BLK);
    
    setupEventListeners();

    document.getElementById('ranking-overlay').onclick = (e) => {
        if(e.target.id === 'ranking-overlay') UI.closeRankingModal(togglePause);
    };

    document.getElementById('admin-msg-overlay').onclick = (e) => {
        if(e.target.id === 'admin-msg-overlay') UI.closeAdminModal();
    };
    document.getElementById('admin-close-x').onclick = UI.closeAdminModal;
};

function setupEventListeners() {
    document.getElementById('mute-btn').onclick = (e) => {
        e.stopPropagation();
        const dummyBtn = { innerText: '' }; 
        const muted = toggleAudioMute(dummyBtn);
        UI.updateSpeakerIcon(muted);
        
        const slider = document.getElementById('vol-slider');
        if (muted) {
            slider.value = 0;
            stopBGM();
        } else {
            slider.value = 50; 
            setAudioVolume(50);
            if(state.run && !state.isPaused && !state.isAutoMode) playBGM(state.currentBGM);
        }
    };

    document.getElementById('vol-slider').oninput = (e) => {
        const val = Number(e.target.value);
        setAudioVolume(val);
        UI.updateSpeakerIcon(val === 0);
    };

    document.getElementById('bgm-select').onchange = (e) => {
        state.currentBGM = e.target.value;
        if(state.run && !state.isPaused && !state.isAutoMode) playBGM(state.currentBGM);
    };
    
    ['bgm-select', 'vol-slider', 'lang-btn', 'profile-trigger', 'file-in', 'nick-in', 'comment-in', 'heart-input'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.onclick = (e) => e.stopPropagation();
    });

    document.getElementById('lang-btn').onclick = (e) => { e.stopPropagation(); UI.toggleLangMenu(); };
    document.querySelectorAll('.lang-opt').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); UI.setLang(btn.dataset.lang); };
    });
    
    document.getElementById('profile-trigger').onclick = (e) => {
        e.stopPropagation();
        document.getElementById('file-in').click();
    };
    document.getElementById('file-in').onchange = UI.handleFile;

    document.getElementById('start-btn').onclick = (e) => { e.stopPropagation(); startCountdown(); };
    document.getElementById('lobby-rank-btn').onclick = (e) => { e.stopPropagation(); UI.openRankingModal(togglePause); };

    document.getElementById('quit-btn').onclick = (e) => { e.stopPropagation(); quitGame(); };
    document.getElementById('restart-btn').onclick = (e) => { e.stopPropagation(); restart(); };
    document.getElementById('result-rank-btn').onclick = (e) => { e.stopPropagation(); UI.openRankingModal(togglePause); };

    document.querySelectorAll('.btn-diff').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); setDifficulty(btn.dataset.diff); };
    });

    document.getElementById('top-left-rank-btn').onclick = (e) => { e.stopPropagation(); UI.openRankingModal(togglePause); };
    document.getElementById('rank-close-x').onclick = (e) => { e.stopPropagation(); UI.closeRankingModal(togglePause); };
    document.getElementById('save-rank-btn').onclick = (e) => { 
        e.stopPropagation(); 
        UI.handleSaveRank(getAiLevelNum, getCountryCode, UI.showToast); 
    };
    
    document.getElementById('auto-mode-btn').onclick = (e) => {
        e.stopPropagation();
        closeResultAndStartAuto();
    };

    document.querySelectorAll('.rank-tab').forEach(tab => {
        tab.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.rank-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            UI.loadRankingData(Number(e.target.dataset.lvl));
        };
    });

    ['heart-lobby', 'heart-result'].forEach(id => {
        const container = document.getElementById(id);
        if(!container) return;
        const icon = container.querySelector('.heart-icon-wrapper');
        const text = container.querySelector('.heart-text');
        const input = container.querySelector('.heart-input');

        container.onclick = (e) => e.stopPropagation(); 
        icon.onclick = (e) => { e.stopPropagation(); UI.handleHeartIconClick(e); };
        text.onclick = (e) => { e.stopPropagation(); UI.handleHeartTextClick(text, input); };
        input.onblur = () => UI.processHeartInput(text, input);
        input.onkeydown = (e) => { 
            if (e.key === 'Enter') UI.processHeartInput(text, input);
            if (e.key === 'Escape') UI.resetHeartInput(text, input);
        };
    });

    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const targetId = e.target.dataset.target;
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            document.querySelectorAll('.admin-view').forEach(v => v.classList.add('hidden'));
            document.getElementById(targetId).classList.remove('hidden');
        };
    });
}

function setDifficulty(lvl) {
    UI.updateDiffUI(lvl); 
    if(state.run && state.opponent.bot && !state.isAutoMode) {
        state.opponent.bot = new Bot(state.difficulty, receiveAtkFromBot);
    }
}

// --- 터치 핸들러 (수정됨) ---
function handleTouchStart(e) {
    // 2손가락: 화면 전환
    touchFingerCount = e.touches.length;
    if (touchFingerCount >= 2) {
        touchStartX = e.touches[0].clientX;
        return;
    }

    // UI 요소 제외
    if (e.target.closest('button, input, select, label, .overlay:not(.hidden) .card, #ranking-overlay .rank-card')) {
        return;
    }

    // 1손가락 좌표 기록 (내 화면일 때만)
    if (state.run && !state.isPaused && !state.isAutoMode && state.mobileView === 1) {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
    }
}

function handleTouchEnd(e) {
    // 2손가락: 화면 전환 (스와이프만 함, 일시정지 없음)
    if (touchFingerCount >= 2) {
        const touchEndX = e.changedTouches[0].clientX;
        const diffX = touchEndX - touchStartX;
        
        if (Math.abs(diffX) > 50) { 
            const maxView = state.isCombinedView ? 2 : 3;
            if (diffX < 0) { 
                state.mobileView = Math.min(state.mobileView + 1, maxView);
            } else { 
                state.mobileView = Math.max(state.mobileView - 1, 0);
            }
            UI.updateMobileView();
            // [수정] 스와이프 시 자동 일시정지/재개 로직 제거 (요청사항 반영)
        }
        touchFingerCount = 0;
        return;
    }

    if (e.target.closest('button, input, select, label, .overlay:not(.hidden) .card, #ranking-overlay .rank-card')) {
        return;
    }

    // 1손가락 컨트롤
    const touchEndY = e.changedTouches[0].clientY;
    const height = window.innerHeight;
    
    // [수정] 상단 영역 4분할 로직 (더블탭 제거)
    // 0 ~ 25%: Fullscreen
    if (touchEndY < height * 0.25) {
        UI.toggleFullScreen();
        return;
    } 
    // 25% ~ 50%: Pause
    else if (touchEndY < height * 0.5) {
        // [중요] 모든 뷰에서 상단2 영역 터치 시 일시정지 동작 (요청사항)
        togglePause();
        return;
    }

    // 하단 영역 (50% ~ 100%) -> 게임 컨트롤 (내 화면일 때만)
    if (state.run && !state.isPaused && !state.isAutoMode && state.mobileView === 1) {
        e.preventDefault(); 

        const touchEndX = e.changedTouches[0].clientX;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        
        if (Math.abs(diffX) > 30 || Math.abs(diffY) > 30) {
            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX < 0) playerMove(-1); 
                else if (diffX > 0) playerMove(1); 
            } else {
                if (diffY > 0) {
                    playerHardDrop();
                }
            }
        } else {
            playerRotate();
        }
    }
}

function handleGlobalKey(e) {
    if (state.isAutoMode) {
        stopAutoModeAndStartGame();
    } else {
        if(!state.run || state.isPaused) return;
        if(!document.getElementById('ranking-overlay').classList.contains('hidden')) return;
        if(!document.getElementById('admin-msg-overlay').classList.contains('hidden')) return; 

        if([32,37,38,39,40].includes(e.keyCode)) e.preventDefault();
        if(e.keyCode===37) playerMove(-1); else if(e.keyCode===39) playerMove(1);
        else if(e.keyCode===40) playerDrop(); else if(e.keyCode===38) playerRotate();
        else if(e.keyCode===32) playerHardDrop();
    }
}

function handleGlobalClick(e) {
    initAudio(); 
    const langMenu = document.getElementById('lang-menu');
    if (langMenu.classList.contains('show') && !e.target.closest('#lang-ctrl')) {
        langMenu.classList.remove('show');
        return; 
    }
    if(!document.getElementById('ranking-overlay').classList.contains('hidden')) return;
    if(!document.getElementById('admin-msg-overlay').classList.contains('hidden')) return;

    if (state.isAutoMode) {
        stopAutoModeAndStartGame();
        return;
    }

    if (!state.run || !document.getElementById('lobby').classList.contains('hidden')) return;
    if (document.getElementById('result-area').style.display === 'flex') return;

    if (e.target.closest('button, input, select, label, .profile-container, #audio-ctrl, #lang-ctrl, .diff-ctrl, .heart-container')) return;
    
    togglePause();
}

function stopAutoModeAndStartGame() {
    if (state.animationId) cancelAnimationFrame(state.animationId);
    state.isAutoMode = false;
    state.run = false;
    document.getElementById('auto-msg-overlay').classList.add('hidden');
    document.getElementById('game-title').innerText = STRINGS[state.curLang].title;
    startCountdown();
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
        document.getElementById('game-title').innerText = state.isAutoMode ? STRINGS[state.curLang].autoModeTitle : STRINGS[state.curLang].title;
        loop(performance.now());
    }
}

function startCountdown() {
    initAudio(); stopBGM(); UI.saveNick();
    if (state.animationId) cancelAnimationFrame(state.animationId);
    state.isAutoMode = false;
    document.getElementById('game-title').innerText = STRINGS[state.curLang].title;
    document.body.classList.add('game-started'); 

    const m = Math.floor(state.duration / 60000);
    const s = Math.floor((state.duration % 60000) / 1000);
    document.getElementById('timer').innerText = `0${m}:${s<10?'0':''}${s}`;
    
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('result-area').style.display = 'none';
    
    const countOverlay = document.getElementById('count-overlay');
    countOverlay.style.display = 'flex';
    
    const msgEl = document.getElementById('count-msg');
    
    msgEl.innerHTML = (state.difficulty === 'superHard' ? STRINGS[state.curLang].superHardMsg : "") + STRINGS[state.curLang].guideHtml;
    
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
            countOverlay.style.display = 'none';
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
    // [추가] 오디오 컨텍스트가 suspended 상태라면 깨워서 BGM 재생 준비
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            console.log("AudioContext resumed on game start");
        });
    }

    if (state.animationId) cancelAnimationFrame(state.animationId);
    
    state.run = true; state.isPaused = false;
    state.isAutoMode = false;
    state.autoBotLeft = null;
    
    state.mobileView = 1;
    UI.updateMobileView();

    state.grid = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    state.grid[18] = genGarbage(); state.grid[19] = genGarbage();
    state.player.score = 0; state.stats = {atk:0, rec:0};
    state.dropCounter = 0;
    state.startTime = Date.now();
    state.lastTime = performance.now();
    state.bag = []; state.next = null;
    
    initNextBlock(); resetPiece(); 
    UI.updateStatsUI();
    document.getElementById('quit-btn').classList.remove('hidden');
    playSFX('start'); 
    
    const randomBgmType = playRandomBGM(); 
    if (randomBgmType) {
        state.currentBGM = randomBgmType;
        const selectEl = document.getElementById('bgm-select');
        if(selectEl) selectEl.value = randomBgmType;
    }
    
    loop(performance.now());
}

function startAutoMode() {
    if (state.animationId) cancelAnimationFrame(state.animationId);

    state.run = true;
    state.isPaused = false;
    state.isAutoMode = true;
    
    state.autoBotLeft = new Bot('superHard', (lines) => {
        if(state.opponent.bot) state.opponent.bot.receiveAtk(lines);
        UI.animateAttack('player', lines, null);
    });
    
    state.opponent.bot = new Bot('superHard', (lines) => {
        if(state.autoBotLeft) state.autoBotLeft.receiveAtk(lines);
        UI.animateAttack('opponent', lines, null);
    });

    document.getElementById('timer').innerText = "AUTO";
    document.getElementById('game-title').innerText = STRINGS[state.curLang].autoModeTitle;
    document.getElementById('auto-msg-overlay').classList.remove('hidden');
    document.getElementById('quit-btn').classList.add('hidden');
    
    stopBGM();
    state.lastTime = performance.now();
    loop(performance.now());
}

function loop(time = 0) {
    if(!state.run || state.isPaused) return; 
    
    const dt = time - state.lastTime;
    state.lastTime = time;

    if (state.isAutoMode) {
        if(state.autoBotLeft) {
            const resLeft = state.autoBotLeft.update(dt);
            document.getElementById('s-my-score').innerText = state.autoBotLeft.score;
            if(resLeft === "WIN") { resetAutoMode(); return; }
        }
        if(state.opponent.bot) {
            const resRight = state.opponent.bot.update(dt);
            document.getElementById('s-opp-score').innerText = state.opponent.bot.score;
            if(resRight === "WIN") { resetAutoMode(); return; }
        }
        draw();
        state.animationId = requestAnimationFrame(loop);
        return;
    }

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

function resetAutoMode() {
    if (state.animationId) cancelAnimationFrame(state.animationId);
    startAutoMode();
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
        const scoreTable = { 1: 100, 2: 300, 3: 500, 4: 800 };
        const scoreAdd = scoreTable[lines] || (lines * 100);
        
        state.player.score += scoreAdd; 
        state.stats.atk += lines;
        
        playSFX('clear'); UI.updateStatsUI();
        if(state.opponent.isAI && state.opponent.bot) {
            UI.animateAttack('player', lines, scoreAdd, () => {
                state.opponent.bot.receiveAtk(lines);
            });
        }
    }
}

function receiveAtkFromBot(lines) {
    UI.animateAttack('opponent', lines, 0, () => {
        state.stats.rec += lines; UI.updateStatsUI();
        for(let i=0; i<lines; i++) { state.grid.shift(); state.grid.push(genGarbage()); }
        playSFX('attack'); draw();
    });
}
function draw() {
    ctxMe.fillStyle = '#000'; ctxMe.fillRect(0,0,320,640);
    if (state.isAutoMode && state.autoBotLeft) {
        drawGrid(ctxMe, state.autoBotLeft.getRenderGrid(), BLK);
    } else {
        drawGrid(ctxMe, state.grid, BLK); 
        if(state.player.matrix) {
            let gy = state.player.pos.y;
            while(!collide(state.grid, {matrix:state.player.matrix, pos:{x:state.player.pos.x, y:gy+1}})) gy++;
            drawMatrix(ctxMe, state.player.matrix, {x:state.player.pos.x, y:gy}, BLK, true);
            drawMatrix(ctxMe, state.player.matrix, state.player.pos, BLK);
        }
    }
    if (state.isAutoMode || (state.opponent.isAI && state.opponent.bot)) {
        drawOpponent();
    }
}
function drawOpponent() {
    ctxOpp.fillStyle = '#000'; ctxOpp.fillRect(0,0,320,640);
    let g = state.opponent.grid;
    if(state.opponent.bot) g = state.opponent.bot.getRenderGrid();
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

function quitGame() { 
    if(!state.run) return; 
    stopBGM(); 
    endGame("LOSE"); 
}

async function endGame(res) {
    if(state.animationId) cancelAnimationFrame(state.animationId); 
    state.run = false; stopBGM();
    
    document.body.classList.remove('game-started'); 

    const nick = localStorage.getItem('tetris_nick') || "Anonymous";
    const lvlNum = getAiLevelNum(state.difficulty);
    const isWin = (res === "WIN");
    
    state.currentSessionStats = await updateFightLog(nick, lvlNum, isWin);

    document.getElementById('quit-btn').classList.add('hidden');
    document.getElementById('result-area').style.display='flex';
    document.getElementById('game-title').innerText = STRINGS[state.curLang].title;
    document.getElementById('timer').style.opacity = '1';

    document.getElementById('rank-save-area').classList.add('hidden');
    const txt = document.getElementById('res-text');

    if(isWin) {
        txt.innerText = STRINGS[state.curLang].winMsg;
        txt.classList.add('win'); 
        fireConfetti();
        playEndSound('win'); 
        state.record.win++;

        const isTop10 = await checkIfRanker(lvlNum, state.player.score);

        if (isTop10 && state.player.score > 0) {
            document.getElementById('rank-save-area').classList.remove('hidden');
            document.getElementById('comment-in').value = "";
            document.getElementById('save-rank-btn').disabled = false;
            document.getElementById('save-rank-btn').innerText = STRINGS[state.curLang].saveRankBtn;
        }
    } else {
        txt.innerText = STRINGS[state.curLang].loseMsg;
        txt.classList.remove('win');
        playEndSound('lose'); 
        state.record.lose++;
    }
    
    localStorage.setItem('tetris_record', JSON.stringify(state.record));
    UI.updateRecordUI();
}

function restart() {
    document.getElementById('result-area').style.display='none';
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    startCountdown();
}
function fireConfetti(){const e=Date.now()+3000;(function f(){confetti({particleCount:5,angle:60,origin:{x:0}});confetti({particleCount:5,angle:120,origin:{x:1}});if(Math.random()<0.1)playSFX('clear');if(Date.now()<e)requestAnimationFrame(f);})();}

function getAiLevelNum(diffStr) {
    switch(diffStr) {
        case 'easy': return 1;
        case 'normal': return 2;
        case 'hard': return 3;
        case 'superHard': return 4;
        default: return 2;
    }
}
function getCountryCode(lang) {
    if (lang === 'ko') return 'KR';
    if (lang === 'ja') return 'JP';
    return 'US'; 
}
function closeResultAndStartAuto() {
    document.getElementById('result-area').style.display = 'none';
    startAutoMode();
}